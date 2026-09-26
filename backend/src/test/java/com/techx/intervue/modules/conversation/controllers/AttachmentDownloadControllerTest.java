package com.techx.intervue.modules.conversation.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.services.impl.AttachmentService;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * R-06 trên bề mặt rủi ro nhất của Plan 3A. Test đơn vị của AttachmentService mock
 * ConversationLookup, nên nó chứng minh service GỌI kiểm quyền — không chứng minh một request HTTP
 * từ người ngoài thread nhận đúng 403.
 *
 * <p>Khoảng trống đó đã cắn thật: AttachmentDownloadController từng thiếu trong assignableTypes của
 * ConversationExceptionHandler, mọi người ngoài thread nhận 500 thay vì 403, và không test tự động
 * nào thấy — chỉ curl tay mới thấy. Test này đi qua server thật, filter chain thật và JWT thật,
 * đúng cách giám khảo sẽ thử.
 *
 * <p>Không dùng @Transactional: request chạy trên luồng khác của server, phải thấy dữ liệu đã
 * commit. Dọn tay ở tearDown.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AttachmentDownloadControllerTest {

    @LocalServerPort int port;

    @Autowired UserRepository users;
    @Autowired ConversationRepository conversations;
    @Autowired MessageRepository messages;
    @Autowired MessageAttachmentRepository attachments;
    @Autowired MessageReportRepository reports;
    @Autowired JwtServiceInterface jwt;
    @Autowired UserSessionCache sessions;

    @Autowired
    @Qualifier("chatFileStorage")
    FileStorageServiceInterface chatStorage;

    User sender;
    User recipient;
    User outsider;
    Conversation thread;
    Message imageMessage;
    MessageAttachment attachment;
    String storageKey;

    @BeforeEach
    void setUp() {
        sender = newUser(RoleType.CUSTOMER);
        recipient = newUser(RoleType.FARMER);
        outsider = newUser(RoleType.CUSTOMER);
        thread = conversations.save(Conversation.between(sender.getId(), recipient.getId()));
        imageMessage =
                messages.save(
                        Message.builder()
                                .conversationId(thread.getId())
                                .senderId(sender.getId())
                                .kind(MessageKind.IMAGE)
                                .createdAt(Instant.now())
                                .build());
        storageKey = UUID.randomUUID() + ".jpg";
        chatStorage.store(AttachmentService.FOLDER, storageKey, new byte[] {1, 2, 3});
        attachment =
                attachments.save(
                        MessageAttachment.builder()
                                .messageId(imageMessage.getId())
                                .uploaderId(sender.getId())
                                .storageKey(storageKey)
                                .mime("image/jpeg")
                                .sizeBytes(3)
                                .width(10)
                                .height(10)
                                .build());
    }

    @AfterEach
    void tearDown() {
        sessions.evict(sender.getId());
        sessions.evict(recipient.getId());
        sessions.evict(outsider.getId());
        attachments.deleteById(attachment.getId());
        chatStorage.delete(AttachmentService.FOLDER, storageKey);
        conversations.deleteById(thread.getId()); // messages cascade at the DB
        users.deleteById(sender.getId());
        users.deleteById(recipient.getId());
        users.deleteById(outsider.getId());
    }

    @Test
    void theSenderGetsThePhotoWithPrivateCachingHeaders() throws Exception {
        HttpResponse<byte[]> response = downloadBytes(url(), sender);

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).containsExactly(1, 2, 3);
        assertThat(header(response, "content-type")).isEqualTo("image/jpeg");
        assertThat(header(response, "cache-control")).isEqualTo("max-age=86400, private");
        assertThat(header(response, "x-content-type-options")).isEqualTo("nosniff");
    }

    @Test
    void theOtherMemberOfTheThreadGetsThePhoto() throws Exception {
        assertThat(downloadBytes(url(), recipient).statusCode()).isEqualTo(200);
    }

    /** R-06 — đúng thứ giám khảo sẽ thử bằng cách đổi id trên URL. */
    @Test
    void someoneOutsideTheThreadGetsForbiddenWithAReason() throws Exception {
        HttpResponse<String> response = download(url(), outsider);

        assertThat(response.statusCode()).isEqualTo(403);
        assertThat(response.body()).contains("NOT_A_MEMBER").contains("\"success\":false");
    }

    @Test
    void anAnonymousRequestIsUnauthorized() throws Exception {
        HttpResponse<String> response =
                HttpClient.newHttpClient()
                        .send(
                                HttpRequest.newBuilder(URI.create(base() + url())).GET().build(),
                                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(401);
    }

    @Test
    void anUnknownIdIsNotFound() throws Exception {
        HttpResponse<String> response = download("/api/v1/attachments/99999999", sender);

        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(response.body()).contains("NOT_FOUND");
    }

    /** Tin bị admin ẩn thì ảnh biến mất theo, y như tin biến mất khỏi danh sách. */
    @Test
    void aPhotoOnAHiddenMessageIsNotFound() throws Exception {
        imageMessage.setHiddenAt(Instant.now());
        imageMessage.setHiddenBy(outsider.getId());
        messages.save(imageMessage);

        assertThat(download(url(), recipient).statusCode()).isEqualTo(404);
    }

    private String base() {
        return "http://localhost:" + port;
    }

    private String url() {
        return "/api/v1/attachments/" + attachment.getId();
    }

    private static String header(HttpResponse<?> response, String name) {
        return response.headers().firstValue(name).orElse(null);
    }

    private HttpRequest requestAs(String path, User as) {
        return HttpRequest.newBuilder(URI.create(base() + path))
                .header("Authorization", "Bearer " + jwt.generateToken(as.getId()))
                .GET()
                .build();
    }

    private HttpResponse<String> download(String path, User as) throws Exception {
        return HttpClient.newHttpClient()
                .send(requestAs(path, as), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<byte[]> downloadBytes(String path, User as) throws Exception {
        return HttpClient.newHttpClient()
                .send(requestAs(path, as), HttpResponse.BodyHandlers.ofByteArray());
    }

    /**
     * JwtAuthFilter không chỉ kiểm chữ ký: nó còn đòi một phiên còn sống trong UserSessionCache,
     * đúng như khi đăng nhập thật. Không nạp phiên thì mọi request trả 401 và test sẽ "xanh vì lý
     * do sai".
     */
    private User newUser(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        User saved =
                users.save(
                        User.builder()
                                .fullName("Test " + tag)
                                .email(tag + "@download.test")
                                .phone(
                                        "06"
                                                + String.format(
                                                        "%08d",
                                                        Math.abs(tag.hashCode()) % 100_000_000))
                                .passwordHash("x")
                                .role(role)
                                .build());
        sessions.set(saved.getId(), saved.getEmail(), Set.of(role), Duration.ofMinutes(10));
        return saved;
    }

    /**
     * Quyết định LEAD 26/09 đi qua HTTP thật: admin bị 403 cho tới khi có ai đó báo cáo tin, rồi
     * mới xem được ảnh. Không thế thì báo cáo một bức ảnh khiêu dâm hay ảnh lừa đảo là vô dụng —
     * admin nhìn thấy ô trống rồi phải quyết định mù.
     */
    @Test
    void anAdminGetsThePhotoOnlyOnceTheMessageIsReported() throws Exception {
        User admin = newUser(RoleType.ADMIN);
        MessageReport report = null;
        try {
            assertThat(download(url(), admin).statusCode()).isEqualTo(403);

            report =
                    reports.saveAndFlush(
                            MessageReport.builder()
                                    .messageId(imageMessage.getId())
                                    .reportedBy(recipient.getId())
                                    .reason(ReportReason.ABUSE)
                                    .build());

            assertThat(downloadBytes(url(), admin).statusCode()).isEqualTo(200);
        } finally {
            if (report != null) {
                reports.deleteById(report.getId());
            }
            users.deleteById(admin.getId());
        }
    }

    /** Review Focus #2 qua HTTP: ảnh của tin ngữ cảnh vẫn đóng với admin. */
    @Test
    void anAdminStillCannotOpenThePhotoOfANeighbouringMessage() throws Exception {
        User admin = newUser(RoleType.ADMIN);
        Message neighbour =
                messages.save(
                        Message.builder()
                                .conversationId(thread.getId())
                                .senderId(sender.getId())
                                .kind(MessageKind.IMAGE)
                                .createdAt(Instant.now())
                                .build());
        String neighbourKey = UUID.randomUUID() + ".jpg";
        chatStorage.store(AttachmentService.FOLDER, neighbourKey, new byte[] {9, 9, 9});
        MessageAttachment neighbourPhoto =
                attachments.save(
                        MessageAttachment.builder()
                                .messageId(neighbour.getId())
                                .uploaderId(sender.getId())
                                .storageKey(neighbourKey)
                                .mime("image/jpeg")
                                .sizeBytes(3)
                                .width(10)
                                .height(10)
                                .build());
        MessageReport report =
                reports.saveAndFlush(
                        MessageReport.builder()
                                .messageId(imageMessage.getId())
                                .reportedBy(recipient.getId())
                                .reason(ReportReason.ABUSE)
                                .build());
        try {
            // Tin bị báo cáo: mở được
            assertThat(downloadBytes(url(), admin).statusCode()).isEqualTo(200);
            // Tin hàng xóm trong cùng thread, chưa ai báo cáo: đóng
            assertThat(
                            download("/api/v1/attachments/" + neighbourPhoto.getId(), admin)
                                    .statusCode())
                    .isEqualTo(403);
        } finally {
            reports.deleteById(report.getId());
            attachments.deleteById(neighbourPhoto.getId());
            chatStorage.delete(AttachmentService.FOLDER, neighbourKey);
            messages.deleteById(neighbour.getId());
            users.deleteById(admin.getId());
        }
    }
}
