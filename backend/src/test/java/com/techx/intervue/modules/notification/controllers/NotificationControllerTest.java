package com.techx.intervue.modules.notification.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.notification.NotificationTestSupport;
import com.techx.intervue.modules.notification.entities.Notification;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.repositories.NotificationRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.net.http.HttpResponse;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class NotificationControllerTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;
    @Autowired NotificationRepository notifications;
    @Autowired StringRedisTemplate redis;

    NotificationTestSupport api;
    User me;
    User other;

    @BeforeEach
    void setUp() {
        api = new NotificationTestSupport(users, sessions, jwt, port);
        me = api.user(RoleType.CUSTOMER);
        other = api.user(RoleType.CUSTOMER);
    }

    @AfterEach
    void tearDown() {
        redis.delete("notif:test:" + me.getId());
        api.cleanUp();
    }

    private Notification row(User owner, boolean read, String title, Instant at) {
        return notifications.save(
                Notification.builder()
                        .userId(owner.getId())
                        .kind(NotificationKind.FARMER_APPROVED)
                        .title(title)
                        .message("m")
                        .link("/farmer")
                        .read(read)
                        .createdAt(at)
                        .build());
    }

    @Test
    void listShowsOnlyMineNewestFirst() {
        row(me, false, "older", Instant.parse("2026-09-25T01:00:00Z"));
        row(me, true, "newer", Instant.parse("2026-09-25T02:00:00Z"));
        row(other, false, "not mine", Instant.parse("2026-09-25T03:00:00Z"));

        HttpResponse<String> r = api.send("GET", "/api/v1/notifications", me, null);

        assertThat(r.statusCode()).isEqualTo(200);
        assertThat(r.body()).contains("\"total\":2").doesNotContain("not mine");
        assertThat(r.body().indexOf("newer")).isLessThan(r.body().indexOf("older"));
    }

    @Test
    void theUnreadFilterHidesReadRows() {
        row(me, false, "fresh row", Instant.parse("2026-09-25T01:00:00Z"));
        row(me, true, "seen row", Instant.parse("2026-09-25T02:00:00Z"));

        HttpResponse<String> r = api.send("GET", "/api/v1/notifications?isRead=false", me, null);

        assertThat(r.body())
                .contains("fresh row")
                .doesNotContain("seen row")
                .contains("\"total\":1");
    }

    @Test
    void aTooLargePageSizeIs400() {
        assertThat(api.send("GET", "/api/v1/notifications?size=500", me, null).statusCode())
                .isEqualTo(400);
    }

    @Test
    void markingSomeoneElsesNotificationIs403() {
        Notification theirs = row(other, false, "t", Instant.now());

        HttpResponse<String> r =
                api.send("PATCH", "/api/v1/notifications/" + theirs.getId() + "/read", me, null);

        assertThat(r.statusCode()).isEqualTo(403);
        assertThat(notifications.findById(theirs.getId()).orElseThrow().isRead()).isFalse();
    }

    @Test
    void markingAMissingNotificationIs404() {
        assertThat(api.send("PATCH", "/api/v1/notifications/999999999/read", me, null).statusCode())
                .isEqualTo(404);
    }

    @Test
    void markingMyOwnNotificationReadWorks() {
        Notification mine = row(me, false, "t", Instant.now());

        assertThat(
                        api.send(
                                        "PATCH",
                                        "/api/v1/notifications/" + mine.getId() + "/read",
                                        me,
                                        null)
                                .statusCode())
                .isEqualTo(200);
        assertThat(notifications.findById(mine.getId()).orElseThrow().isRead()).isTrue();
    }

    @Test
    void readAllReturnsHowManyChangedAndTheCountDropsToZero() {
        row(me, false, "a", Instant.now());
        row(me, false, "b", Instant.now());
        row(other, false, "c", Instant.now());

        HttpResponse<String> r = api.send("PATCH", "/api/v1/notifications/read-all", me, null);
        assertThat(r.body()).contains("\"updated\":2");

        assertThat(api.send("GET", "/api/v1/notifications/unread-count", me, null).body())
                .contains("\"count\":0");
        assertThat(api.send("GET", "/api/v1/notifications/unread-count", other, null).body())
                .contains("\"count\":1");
    }

    @Test
    void preferencesStartWithDefaultsAndRoundTrip() {
        assertThat(api.send("GET", "/api/v1/notifications/preferences", me, null).body())
                .contains("\"category\":\"messages\",\"inApp\":true,\"browser\":true")
                .doesNotContain("farmerApplications");

        HttpResponse<String> saved =
                api.send(
                        "PUT",
                        "/api/v1/notifications/preferences",
                        me,
                        """
                        {"categories":[{"category":"messages","inApp":true,"browser":false}],
                         "sound":false,"quietOn":true,"quietFrom":"22:30","quietTo":"06:30"}""");
        assertThat(saved.statusCode()).isEqualTo(200);

        assertThat(api.send("GET", "/api/v1/notifications/preferences", me, null).body())
                .contains("\"category\":\"messages\",\"inApp\":true,\"browser\":false")
                .contains("\"sound\":false")
                .contains("\"quietFrom\":\"22:30\"");
    }

    @Test
    void aBadQuietTimeIs400() {
        HttpResponse<String> r =
                api.send(
                        "PUT",
                        "/api/v1/notifications/preferences",
                        me,
                        """
                        {"categories":[],"sound":true,"quietOn":true,"quietFrom":"25:00","quietTo":"07:00"}""");

        assertThat(r.statusCode()).isEqualTo(400);
    }

    @Test
    void aGroupOfAnotherRoleIs400() {
        HttpResponse<String> r =
                api.send(
                        "PUT",
                        "/api/v1/notifications/preferences",
                        me,
                        """
                        {"categories":[{"category":"farmerApplications","inApp":true,"browser":true}],
                         "sound":true,"quietOn":false,"quietFrom":"22:00","quietTo":"07:00"}""");

        assertThat(r.statusCode()).isEqualTo(400);
    }

    @Test
    void theTestNotificationIsRateLimitedAndNeverStored() {
        assertThat(api.send("POST", "/api/v1/notifications/test", me, null).statusCode())
                .isEqualTo(200);
        assertThat(api.send("POST", "/api/v1/notifications/test", me, null).statusCode())
                .isEqualTo(429);
        assertThat(notifications.countByUserIdAndReadFalse(me.getId())).isZero();
    }

    @Test
    void anonymousCallsAre401() {
        assertThat(api.send("GET", "/api/v1/notifications", null, null).statusCode())
                .isEqualTo(401);
    }
}
