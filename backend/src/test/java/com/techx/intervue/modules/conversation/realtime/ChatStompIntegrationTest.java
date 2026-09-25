package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
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

/** Simple broker (host rỗng) để CI không cần Rabbit; đường đi qua Rabbit kiểm bằng tay ở Task 8. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class ChatStompIntegrationTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired ConversationRepository conversations;
    @Autowired MessageServiceInterface messageService;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;

    User customer;
    User farmer;
    Conversation thread;
    WebSocketStompClient client;

    @BeforeEach
    void setUp() {
        customer = newUser(RoleType.CUSTOMER);
        farmer = newUser(RoleType.FARMER);
        thread = conversations.save(Conversation.between(customer.getId(), farmer.getId()));
        client = new WebSocketStompClient(new StandardWebSocketClient());
        // byte[] hai chiều, không kén content-type; frame /app/typing mang content-type JSON riêng
        client.setMessageConverter(new SimpleMessageConverter());
    }

    @AfterEach
    void tearDown() {
        client.stop();
        conversations.deleteById(thread.getId());
        sessions.evict(customer.getId());
        sessions.evict(farmer.getId());
        users.deleteById(customer.getId());
        users.deleteById(farmer.getId());
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
                        (WebSocketHttpHeaders) null, // tránh mơ hồ với overload varargs
                        headers,
                        new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);
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
        BlockingQueue<String> inbox = subscribe(farmerSession, "/user/queue/messages");
        BlockingQueue<String> threads = subscribe(farmerSession, "/user/queue/conversations");
        Thread.sleep(300); // để SUBSCRIBE tới broker trước khi gửi

        messageService.send(
                customer.getId(),
                thread.getId(),
                new SendMessageRequest(null, "Still fresh?", null, null));

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

    @Test
    void theSenderGetsAThreadUpdateButNotTheirOwnMessage() throws Exception {
        StompSession customerSession = connectAs(customer);
        BlockingQueue<String> inbox = subscribe(customerSession, "/user/queue/messages");
        BlockingQueue<String> threads = subscribe(customerSession, "/user/queue/conversations");
        Thread.sleep(300);

        messageService.send(
                customer.getId(),
                thread.getId(),
                new SendMessageRequest(null, "hello", null, null));

        assertThat(threads.poll(5, TimeUnit.SECONDS)).isNotNull().contains("\"unreadCount\":0");
        assertThat(inbox.poll(1, TimeUnit.SECONDS)).isNull();
    }

    @Test
    void connectingWithABadTokenIsRefused() {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer not-a-jwt");

        assertThatThrownBy(
                        () ->
                                client.connectAsync(
                                                "ws://localhost:" + port + WebSocketConfig.ENDPOINT,
                                                (WebSocketHttpHeaders) null,
                                                headers,
                                                new StompSessionHandlerAdapter() {})
                                        .get(5, TimeUnit.SECONDS))
                .isInstanceOf(ExecutionException.class);
    }

    @Test
    void typingReachesTheOtherMember() throws Exception {
        StompSession customerSession = connectAs(customer);
        StompSession farmerSession = connectAs(farmer);
        BlockingQueue<String> typing = subscribe(farmerSession, "/user/queue/typing");
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
}
