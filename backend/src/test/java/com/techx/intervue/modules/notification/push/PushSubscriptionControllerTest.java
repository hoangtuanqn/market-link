package com.techx.intervue.modules.notification.push;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.notification.NotificationTestSupport;
import com.techx.intervue.modules.notification.repositories.PushSubscriptionRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class PushSubscriptionControllerTest {

    private static final String PATH = "/api/v1/notifications/push-subscriptions";

    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;
    @Autowired PushSubscriptionRepository subscriptions;

    NotificationTestSupport api;
    User me;
    User other;
    String endpoint;

    @BeforeEach
    void setUp() {
        api = new NotificationTestSupport(users, sessions, jwt, port);
        me = api.user(RoleType.CUSTOMER);
        other = api.user(RoleType.CUSTOMER);
        endpoint = "https://push.example.test/send/" + UUID.randomUUID();
    }

    @AfterEach
    void tearDown() {
        api.cleanUp();
    }

    private String body(String ep) {
        return "{\"endpoint\":\"" + ep + "\",\"keys\":{\"p256dh\":\"BPUB\",\"auth\":\"AUTH\"}}";
    }

    @Test
    void subscribingTwiceKeepsOneRow() {
        assertThat(api.send("POST", PATH, me, body(endpoint)).statusCode()).isEqualTo(200);
        assertThat(api.send("POST", PATH, me, body(endpoint)).statusCode()).isEqualTo(200);

        assertThat(subscriptions.findByUserId(me.getId()))
                .singleElement()
                .satisfies(
                        s -> {
                            assertThat(s.getEndpoint()).isEqualTo(endpoint);
                            assertThat(s.getP256dh()).isEqualTo("BPUB");
                            assertThat(s.getAuth()).isEqualTo("AUTH");
                        });
    }

    @Test
    void theSameBrowserSignedInAsSomeoneElseMovesToThem() {
        api.send("POST", PATH, me, body(endpoint));
        api.send("POST", PATH, other, body(endpoint));

        assertThat(subscriptions.findByUserId(me.getId())).isEmpty();
        assertThat(subscriptions.findByUserId(other.getId())).hasSize(1);
    }

    @Test
    void unsubscribingRemovesMyRowButNotSomeoneElses() {
        api.send("POST", PATH, other, body(endpoint));

        assertThat(api.send("DELETE", PATH, me, "{\"endpoint\":\"" + endpoint + "\"}").statusCode())
                .isEqualTo(200);
        assertThat(subscriptions.findByUserId(other.getId())).hasSize(1);

        api.send("DELETE", PATH, other, "{\"endpoint\":\"" + endpoint + "\"}");
        assertThat(subscriptions.findByUserId(other.getId())).isEmpty();
    }

    @Test
    void missingKeysAre400() {
        assertThat(api.send("POST", PATH, me, "{\"endpoint\":\"" + endpoint + "\"}").statusCode())
                .isEqualTo(400);
    }

    @Test
    void aNonHttpEndpointIs400() {
        assertThat(api.send("POST", PATH, me, body("javascript:alert(1)")).statusCode())
                .isEqualTo(400);
    }

    @Test
    void anonymousIs401() {
        assertThat(api.send("POST", PATH, null, body(endpoint)).statusCode()).isEqualTo(401);
    }
}
