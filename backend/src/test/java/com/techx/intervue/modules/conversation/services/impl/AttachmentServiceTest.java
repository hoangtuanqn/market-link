package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import jakarta.persistence.EntityNotFoundException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

class AttachmentServiceTest {

    static final long MAX_BYTES = 5L * 1024 * 1024;

    MessageAttachmentRepository attachments;
    FileStorageServiceInterface storage;
    ChatRateLimiterInterface rateLimiter;
    MessageRepository messages;
    ConversationLookup lookup;
    AttachmentService service;

    @TempDir Path tmp;
    Path fileOnDisk;

    @BeforeEach
    void setUp() throws Exception {
        attachments = mock(MessageAttachmentRepository.class);
        storage = mock(FileStorageServiceInterface.class);
        rateLimiter = mock(ChatRateLimiterInterface.class);
        messages = mock(MessageRepository.class);
        lookup = mock(ConversationLookup.class);
        fileOnDisk = Files.write(tmp.resolve("x.jpg"), new byte[] {1, 2, 3});
        when(attachments.save(any(MessageAttachment.class)))
                .thenAnswer(
                        inv -> {
                            MessageAttachment a = inv.getArgument(0);
                            a.setId(55L);
                            return a;
                        });
        // Thứ tự khớp constructor: attachments, storage, rateLimiter, maxBytes, messages, lookup
        service =
                new AttachmentService(
                        attachments, storage, rateLimiter, MAX_BYTES, messages, lookup);
    }

    @Test
    void storesThePhotoUnderARandomKeyAndReturnsItsSize() throws Exception {
        AttachmentResource resource =
                service.upload(
                        7L, new MockMultipartFile("file", "holiday.png", "image/png", png(40, 25)));

        assertThat(resource.attachmentId()).isEqualTo(55L);
        assertThat(resource.url()).isEqualTo("/api/v1/attachments/55");
        assertThat(resource.width()).isEqualTo(40);
        assertThat(resource.height()).isEqualTo(25);

        ArgumentCaptor<String> fileName = ArgumentCaptor.forClass(String.class);
        verify(storage).store(anyString(), fileName.capture(), any(byte[].class));
        // Tên file không được lấy từ người dùng (spec §8.2)
        assertThat(fileName.getValue()).doesNotContain("holiday").endsWith(".jpg");
    }

    @Test
    void aPngIsReEncodedToJpegSoItsMetadataIsGone() throws Exception {
        service.upload(7L, new MockMultipartFile("file", "a.png", "image/png", png(40, 25)));

        ArgumentCaptor<MessageAttachment> saved = ArgumentCaptor.forClass(MessageAttachment.class);
        verify(attachments).save(saved.capture());
        assertThat(saved.getValue().getMime()).isEqualTo("image/jpeg");
        assertThat(saved.getValue().getUploaderId()).isEqualTo(7L);
    }

    @Test
    void refusesAPhotoOverTheLimitWithoutTouchingTheDisk() {
        byte[] tooBig = new byte[(int) MAX_BYTES + 1];

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "big.jpg", "image/jpeg", tooBig)))
                .isInstanceOf(AttachmentTooLargeException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
        verify(attachments, never()).save(any(MessageAttachment.class));
    }

    /** Review Focus #1 ở tầng service: không ghi byte nào xuống đĩa. */
    @Test
    void refusesAFileThatIsNotAnImageWhateverItsName() {
        byte[] pdf = "%PDF-1.7 not a photo".getBytes(StandardCharsets.ISO_8859_1);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "photo.jpg", "image/jpeg", pdf)))
                .isInstanceOf(UnsupportedImageTypeException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
    }

    @Test
    void refusesAnEmptyUpload() {
        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "a.jpg", "image/jpeg", new byte[0])))
                .isInstanceOf(UnsupportedImageTypeException.class);
    }

    /**
     * Hạn mức phải chặn TRƯỚC khi ghi đĩa và trước khi ghi DB — vượt ngưỡng thì không được để lại
     * file mồ côi nào.
     */
    @Test
    void refusesToStoreAnythingOnceTheHourlyPhotoLimitIsReached() throws Exception {
        Mockito.doThrow(new RateLimitedException("slow down"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.IMAGE);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "a.png", "image/png", png(40, 25))))
                .isInstanceOf(RateLimitedException.class);

        verify(storage, never()).store(anyString(), anyString(), any(byte[].class));
        verify(attachments, never()).save(any(MessageAttachment.class));
    }

    private static byte[] png(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    @Test
    void theUploaderCanSeeTheirOwnPhotoBeforeItIsSent() {
        MessageAttachment upload = stored(55L, 7L, null);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        AttachmentServiceInterface.StoredFile file = service.read(7L, 55L);

        assertThat(file.mime()).isEqualTo("image/jpeg");
        assertThat(file.sizeBytes()).isEqualTo(100);
    }

    @Test
    void nobodyElseCanSeeAnUploadThatIsNotOnAMessageYet() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, null)));

        assertThatThrownBy(() -> service.read(3L, 55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    @Test
    void aMemberOfTheThreadCanSeeAPhotoTheyDidNotUpload() {
        MessageAttachment upload = stored(55L, 7L, 101L);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.of(fileOnDisk));

        assertThat(service.read(3L, 55L).mime()).isEqualTo("image/jpeg");
        verify(lookup).requireMember(3L, 42L);
    }

    @Test
    void someoneOutsideTheThreadGetsRefused() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L)).thenReturn(Optional.of(messageIn(101L, 42L, null)));
        Mockito.doThrow(new ConversationAccessDeniedException())
                .when(lookup)
                .requireMember(99L, 42L);

        assertThatThrownBy(() -> service.read(99L, 55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
        verify(storage, never()).find(anyString(), anyString());
    }

    /** Review Focus #5. */
    @Test
    void hiddenMessageHidesItsPhotoToo() {
        when(attachments.findById(55L)).thenReturn(Optional.of(stored(55L, 7L, 101L)));
        when(messages.findById(101L))
                .thenReturn(
                        Optional.of(messageIn(101L, 42L, Instant.parse("2026-09-25T06:00:00Z"))));

        assertThatThrownBy(() -> service.read(3L, 55L)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void aRecordWithNoFileOnDiskIsNotFound() {
        MessageAttachment upload = stored(55L, 7L, null);
        when(attachments.findById(55L)).thenReturn(Optional.of(upload));
        when(storage.find(AttachmentService.FOLDER, upload.getStorageKey()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.read(7L, 55L)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void anUnknownAttachmentIdIsNotFound() {
        when(attachments.findById(55L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.read(7L, 55L)).isInstanceOf(EntityNotFoundException.class);
    }

    private static MessageAttachment stored(Long id, Long uploaderId, Long messageId) {
        return MessageAttachment.builder()
                .id(id)
                .uploaderId(uploaderId)
                .messageId(messageId)
                .storageKey(id + "-key.jpg")
                .mime("image/jpeg")
                .sizeBytes(100)
                .width(800)
                .height(600)
                .build();
    }

    private static Message messageIn(Long id, Long conversationId, Instant hiddenAt) {
        return Message.builder()
                .id(id)
                .conversationId(conversationId)
                .senderId(7L)
                .kind(MessageKind.IMAGE)
                .hiddenAt(hiddenAt)
                .build();
    }

    /**
     * Hạn mức 10 ảnh/giờ phải đếm ảnh ĐÃ NHẬN, không đếm lần thử. Người dùng iPhone gửi HEIC (mặc
     * định của iOS) sẽ bị 415 mười lần rồi mất quyền gửi ảnh cả tiếng, kèm thông báo "đang gửi ảnh
     * quá nhanh" trong khi chưa gửi nổi tấm nào.
     */
    @Test
    void aRejectedUploadDoesNotSpendAnHourlyToken() {
        byte[] pdf = "%PDF-1.7 not a photo".getBytes(StandardCharsets.ISO_8859_1);

        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file", "photo.jpg", "image/jpeg", pdf)))
                .isInstanceOf(UnsupportedImageTypeException.class);

        verify(rateLimiter, never())
                .check(
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.any(ChatRateLimiterInterface.Action.class));
    }

    @Test
    void anOversizedUploadDoesNotSpendAnHourlyTokenEither() {
        assertThatThrownBy(
                        () ->
                                service.upload(
                                        7L,
                                        new MockMultipartFile(
                                                "file",
                                                "big.jpg",
                                                "image/jpeg",
                                                new byte[(int) MAX_BYTES + 1])))
                .isInstanceOf(AttachmentTooLargeException.class);

        verify(rateLimiter, never())
                .check(
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.any(ChatRateLimiterInterface.Action.class));
    }

    @Test
    void anAcceptedUploadStillSpendsAnHourlyToken() throws Exception {
        service.upload(7L, new MockMultipartFile("file", "a.png", "image/png", png(40, 25)));

        verify(rateLimiter).check(7L, ChatRateLimiterInterface.Action.IMAGE);
    }
}
