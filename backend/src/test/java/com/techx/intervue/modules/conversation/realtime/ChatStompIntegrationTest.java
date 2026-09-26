package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ModerationServiceInterface;
import com.techx.intervue.modules.notification.repositories.NotificationRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.SimpleMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

/**
 * Simple broker (empty host) so CI does not need Rabbit; the path through Rabbit is checked by hand
 * in Task 8.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class ChatStompIntegrationTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;

    @Autowired
    com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository farmerProfiles;

    @Autowired ConversationRepository conversations;
    @Autowired MessageServiceInterface messageService;
    @Autowired ModerationServiceInterface moderation;
    @Autowired MessageReportRepository reports;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;
    @Autowired NotificationRepository notifications;

    User customer;
    User farmer;
    com.techx.intervue.modules.farmer.entities.FarmerProfile farmerProfile;
    Conversation thread;
    WebSocketStompClient client;

    @BeforeEach
    void setUp() {
        customer = newUser(RoleType.CUSTOMER);
        farmer = newUser(RoleType.FARMER);
        // StallAccessPolicy looks up farmer_profiles (spec §8.1): a farmer role with no approved
        // row
        // is not an open stall, and send() returns 409.
        farmerProfile = approvedStallFor(farmer);
        thread = conversations.save(Conversation.between(customer.getId(), farmer.getId()));
        client = new WebSocketStompClient(new StandardWebSocketClient());
        // byte[] both ways, not picky about content-type; the /app/typing frame carries its own
        // JSON content-type
        client.setMessageConverter(new SimpleMessageConverter());
    }

    @AfterEach
    void tearDown() {
        client.stop();
        conversations.deleteById(thread.getId());
        farmerProfiles.deleteById(farmerProfile.getId());
        sessions.evict(customer.getId());
        sessions.evict(farmer.getId());
        users.deleteById(customer.getId());
        users.deleteById(farmer.getId());
    }

    private com.techx.intervue.modules.farmer.entities.FarmerProfile approvedStallFor(User owner) {
        var profile = new com.techx.intervue.modules.farmer.entities.FarmerProfile();
        profile.setUserId(owner.getId());
        profile.setStallName("Stomp stall");
        profile.setContactPerson(owner.getFullName());
        profile.setApprovalStatus(com.techx.intervue.modules.farmer.enums.ApprovalStatus.APPROVED);
        return farmerProfiles.save(profile);
    }

    private User newUser(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        User u =
                users.save(
                        User.builder()
                                .fullName("E2E " + tag)
                                .email(tag + "@e2e.test")
                                .phone(
                                        "05"
                                                + String.format(
                                                        "%08d",
                                                        Math.abs(tag.hashCode()) % 100_000_000))
                                .passwordHash("x")
                                .role(role)
                                .build());
        sessions.set(u.getId(), u.getEmail(), Set.of(role), Duration.ofMinutes(5));
        return u;
    }

    private StompSession connectAs(User u) throws Exception {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + jwt.generateToken(u.getId()));
        return client.connectAsync(
                        "ws://localhost:" + port + WebSocketConfig.ENDPOINT,
                        (WebSocketHttpHeaders) null, // avoid ambiguity with the varargs overload
                        headers,
                        new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);
    }

    /**
     * One channel carries several kinds of events; wait for the kind needed instead of assuming an
     * order.
     */
    private static String awaitEvent(BlockingQueue<String> q, String marker) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            String frame = q.poll(500, TimeUnit.MILLISECONDS);
            if (frame != null && frame.contains(marker)) {
                return frame;
            }
        }
        return null;
    }

    private static BlockingQueue<String> subscribe(StompSession s, String destination) {
        BlockingQueue<String> q = new LinkedBlockingQueue<>();
        s.subscribe(
                destination,
                new StompFrameHandler() {
                    @Override
                    public Type getPayloadType(StompHeaders h) {
                        return byte[].class;
                    }

                    @Override
                    public void handleFrame(StompHeaders h, Object payload) {
                        q.add(new String((byte[]) payload, StandardCharsets.UTF_8));
                    }
                });
        return q;
    }

    @Test
    void aMessageSentOverRestArrivesAtTheRecipientOverStomp() throws Exception {
        StompSession farmerSession = connectAs(farmer);
        BlockingQueue<String> inbox = subscribe(farmerSession, "/user/topic/messages");
        BlockingQueue<String> threads = subscribe(farmerSession, "/user/topic/conversations");
        Thread.sleep(300); // let SUBSCRIBE reach the broker before sending

        messageService.send(
                customer.getId(),
                thread.getId(),
                new SendMessageRequest(null, "Still fresh?", null, null, null));

        String frame = inbox.poll(5, TimeUnit.SECONDS);
        assertThat(frame)
                .isNotNull()
                .contains("\"body\":\"Still fresh?\"")
                .contains("\"kind\":\"text\"");
        String update = threads.poll(5, TimeUnit.SECONDS);
        assertThat(update)
                .isNotNull()
                .contains("\"type\":\"updated\"")
                .contains("\"unreadCount\":1");
    }

    /**
     * FR-042: a new message triggers a popup for the recipient but does not become a row in
     * /notifications.
     */
    @Test
    void aMessagePopsUpForTheRecipientWithoutBeingStored() throws Exception {
        StompSession farmerSession = connectAs(farmer);
        BlockingQueue<String> popups = subscribe(farmerSession, "/user/topic/notifications");
        Thread.sleep(300); // let SUBSCRIBE reach the broker before sending

        messageService.send(
                customer.getId(),
                thread.getId(),
                new SendMessageRequest(null, "Còn xoài không?", null, null, null));

        String frame = popups.poll(5, TimeUnit.SECONDS);
        assertThat(frame)
                .isNotNull()
                .contains("\"kind\":\"message\"")
                .contains("\"message\":\"Còn xoài không?\"")
                .contains("\"conversationId\":" + thread.getId())
                .contains("\"link\":\"/farmer/messages?c=" + thread.getId() + "\"")
                .contains("\"persistent\":false");
        assertThat(notifications.countByUserIdAndReadFalse(farmer.getId())).isZero();
    }

    @Test
    void theSenderGetsTheMessageAndAThreadUpdateOnEveryDevice() throws Exception {
        StompSession customerSession = connectAs(customer);
        BlockingQueue<String> inbox = subscribe(customerSession, "/user/topic/messages");
        BlockingQueue<String> threads = subscribe(customerSession, "/user/topic/conversations");
        Thread.sleep(300);

        messageService.send(
                customer.getId(),
                thread.getId(),
                new SendMessageRequest(null, "hello", null, null, null));

        assertThat(threads.poll(5, TimeUnit.SECONDS)).isNotNull().contains("\"unreadCount\":0");
        // the sender's other devices also receive the bubble (the FE dedupes by id)
        assertThat(inbox.poll(5, TimeUnit.SECONDS)).isNotNull().contains("\"body\":\"hello\"");
    }

    /**
     * An ERROR frame must carry our own reason, not Spring's internal string, so the FE knows
     * whether to retry.
     */
    @Test
    void connectingWithABadTokenIsRefusedWithAClearReason() {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer not-a-jwt");
        AtomicReference<String> errorMessage = new AtomicReference<>();
        StompSessionHandlerAdapter handler =
                new StompSessionHandlerAdapter() {
                    @Override
                    public void handleFrame(StompHeaders h, Object payload) {
                        errorMessage.set(h.getFirst("message"));
                    }
                };

        assertThatThrownBy(
                        () ->
                                client.connectAsync(
                                                "ws://localhost:" + port + WebSocketConfig.ENDPOINT,
                                                (WebSocketHttpHeaders) null,
                                                headers,
                                                handler)
                                        .get(5, TimeUnit.SECONDS))
                .isInstanceOf(ExecutionException.class);
        assertThat(errorMessage.get()).isEqualTo("Token authentication failed.");
    }

    @Test
    void typingReachesTheOtherMember() throws Exception {
        StompSession customerSession = connectAs(customer);
        StompSession farmerSession = connectAs(farmer);
        BlockingQueue<String> typing = subscribe(farmerSession, "/user/topic/typing");
        Thread.sleep(300);

        StompHeaders h = new StompHeaders();
        h.setDestination("/app/typing");
        h.setContentType(MimeTypeUtils.APPLICATION_JSON);
        customerSession.send(
                h,
                ("{\"conversationId\":" + thread.getId() + ",\"typing\":true}")
                        .getBytes(StandardCharsets.UTF_8));

        assertThat(typing.poll(5, TimeUnit.SECONDS))
                .isNotNull()
                .contains("\"typing\":true")
                .contains("\"userId\":" + customer.getId());
    }

    /**
     * FR-116 through a real broker: when an admin hides a message BOTH people in the thread receive
     * the "hidden" event on /user/topic/conversations — including the sender of the hidden message.
     */
    @Test
    void hidingAMessageReachesBothMembersOverStomp() throws Exception {
        StompSession customerSession = connectAs(customer);
        StompSession farmerSession = connectAs(farmer);
        BlockingQueue<String> customerThreads =
                subscribe(customerSession, "/user/topic/conversations");
        BlockingQueue<String> farmerThreads = subscribe(farmerSession, "/user/topic/conversations");
        Thread.sleep(300); // let SUBSCRIBE reach the broker before hiding

        Long messageId =
                messageService
                        .send(
                                farmer.getId(),
                                thread.getId(),
                                new SendMessageRequest(
                                        null, "Chuyen khoan truoc di", null, null, null))
                        .id();

        MessageReport report =
                reports.saveAndFlush(
                        MessageReport.builder()
                                .messageId(messageId)
                                .reportedBy(customer.getId())
                                .reason(ReportReason.SCAM)
                                .build());
        try {
            moderation.hide(farmer.getId(), messageId);

            // Sending one message already emits "updated" and "read" on this same channel, so we
            // must wait for the exact
            // event needed instead of counting frames.
            String toCustomer = awaitEvent(customerThreads, "\"type\":\"hidden\"");
            String toFarmer = awaitEvent(farmerThreads, "\"type\":\"hidden\"");
            assertThat(toCustomer).isNotNull().contains("\"messageId\":" + messageId);
            // The sender of the hidden message must also see it disappear
            assertThat(toFarmer).isNotNull().contains("\"messageId\":" + messageId);
        } finally {
            reports.deleteById(report.getId());
        }
    }
}
