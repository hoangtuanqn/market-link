package com.techx.intervue.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.realtime.WebSocketConfig;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import com.techx.intervue.modules.notification.enums.Audience;
import com.techx.intervue.modules.notification.repositories.AnnouncementRepository;
import com.techx.intervue.modules.notification.requests.AnnouncementRequest;
import com.techx.intervue.modules.notification.services.interfaces.AnnouncementServiceInterface;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.converter.SimpleMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

/**
 * End to end: a real event → /user/topic/notifications of exactly the right person, through the
 * simple broker.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class NotificationStompIntegrationTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;
    @Autowired FarmerServiceInterface farmerService;
    @Autowired FarmerProfileRepository profiles;
    @Autowired NotificationServiceInterface notificationService;
    @Autowired AnnouncementServiceInterface announcementService;
    @Autowired AnnouncementRepository announcements;
    @Autowired StringRedisTemplate redis;

    NotificationTestSupport support;
    WebSocketStompClient client;
    User owner;
    User other;
    User admin;
    FarmerProfile profile;

    @BeforeEach
    void setUp() {
        support = new NotificationTestSupport(users, sessions, jwt, port);
        owner = support.user(RoleType.CUSTOMER);
        other = support.user(RoleType.CUSTOMER);
        admin = support.user(RoleType.ADMIN);
        profile =
                profiles.save(
                        FarmerProfile.builder()
                                .userId(owner.getId())
                                .stallName("Live Stall")
                                .contactPerson("Tư")
                                .approvalStatus(ApprovalStatus.PENDING)
                                .build());
        client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new SimpleMessageConverter());
    }

    @AfterEach
    void tearDown() {
        client.stop();
        redis.delete("notif:test:" + owner.getId());
        profiles.deleteById(profile.getId());
        announcements.findAll().stream()
                .filter(a -> a.getCreatedBy().equals(admin.getId()))
                .forEach(announcements::delete);
        support.cleanUp();
    }

    private StompSession connectAs(User u) throws Exception {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + support.token(u));
        return client.connectAsync(
                        "ws://localhost:" + port + WebSocketConfig.ENDPOINT,
                        (WebSocketHttpHeaders) null,
                        headers,
                        new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);
    }

    private static BlockingQueue<String> subscribe(StompSession s) {
        BlockingQueue<String> q = new LinkedBlockingQueue<>();
        s.subscribe(
                "/user/topic/notifications",
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
    void theOwnerSeesTheApprovalLiveAndNobodyElseDoes() throws Exception {
        BlockingQueue<String> ownerQ = subscribe(connectAs(owner));
        BlockingQueue<String> otherQ = subscribe(connectAs(other));
        Thread.sleep(300); // let SUBSCRIBE reach the broker before sending

        farmerService.approve(profile.getId(), admin.getId());

        String frame = ownerQ.poll(5, TimeUnit.SECONDS);
        assertThat(frame)
                .isNotNull()
                .contains("\"kind\":\"farmer_approved\"")
                .contains("\"persistent\":true")
                .contains("\"unreadCount\":1")
                .contains("\"link\":\"/farmer\"")
                .contains("Live Stall");
        assertThat(otherQ.poll(500, TimeUnit.MILLISECONDS)).isNull();
    }

    @Test
    void theTestButtonArrivesWithEveryAlertOn() throws Exception {
        BlockingQueue<String> q = subscribe(connectAs(owner));
        Thread.sleep(300);

        notificationService.sendTest(owner.getId());

        assertThat(q.poll(5, TimeUnit.SECONDS))
                .isNotNull()
                .contains("\"kind\":\"test\"")
                .contains("\"inApp\":true")
                .contains("\"browser\":true")
                .contains("\"persistent\":false");
    }

    @Test
    void anAnnouncementReachesAnOnlineCustomerWithItsOwnId() throws Exception {
        BlockingQueue<String> q = subscribe(connectAs(owner));
        Thread.sleep(300);

        announcementService.create(
                admin.getId(),
                new AnnouncementRequest(
                        "Market closed", "Sunday only", Audience.CUSTOMERS, null, null));

        assertThat(q.poll(5, TimeUnit.SECONDS))
                .isNotNull()
                .contains("\"kind\":\"announcement\"")
                .contains("Market closed")
                .contains("\"link\":\"/notifications\"")
                .containsPattern("\"id\":\\d+");
    }
}
