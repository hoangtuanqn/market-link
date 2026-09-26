package com.techx.intervue.modules.notification.push;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.notification.NotificationTestSupport;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

/**
 * VAPID keys: if present, return the public key to the FE; if absent, push is off and the app still
 * runs.
 */
class WebPushConfigTest {

    /** Keys used only in tests (generated with node:crypto, not used in any environment). */
    static final String TEST_PUBLIC =
            "BAJRU6LAEB4OYdOQmHWcmZNCew5snsHaZkQLKvLX3P0LbjWvYmM9SIeyv0jUnZd2LDcJxZvEJC-RkhZjCLaOwFQ";

    static final String TEST_PRIVATE = "XT8BnUcNSQlJ8r5jGccgUFKZHjV4MCvEL1cPmjMHF6w";

    abstract static class Base {
        @LocalServerPort int port;
        @Autowired UserRepository users;
        @Autowired UserSessionCache sessions;
        @Autowired JwtServiceInterface jwt;
        NotificationTestSupport api;
        User me;

        @BeforeEach
        void setUp() {
            api = new NotificationTestSupport(users, sessions, jwt, port);
            me = api.user(RoleType.CUSTOMER);
        }

        @AfterEach
        void tearDown() {
            api.cleanUp();
        }

        String publicKeyBody() {
            return api.send("GET", "/api/v1/notifications/push/public-key", me, null).body();
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @TestPropertySource(
            properties = {
                "app.chat.rabbitmq.host=",
                "app.push.vapid-public-key=",
                "app.push.vapid-private-key="
            })
    class WithoutKeys extends Base {
        @Test
        void thePublicKeyIsNullAndNothingBreaks() {
            assertThat(publicKeyBody()).contains("\"publicKey\":null");
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @TestPropertySource(
            properties = {
                "app.chat.rabbitmq.host=",
                "app.push.vapid-public-key=" + TEST_PUBLIC,
                "app.push.vapid-private-key=" + TEST_PRIVATE,
                "app.push.subject=mailto:dev@marketlink.test"
            })
    class WithKeys extends Base {
        @Test
        void thePublicKeyIsServedForTheBrowser() {
            assertThat(publicKeyBody()).contains("\"publicKey\":\"" + TEST_PUBLIC + "\"");
        }
    }
}
