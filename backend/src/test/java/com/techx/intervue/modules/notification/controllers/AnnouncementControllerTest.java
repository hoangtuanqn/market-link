package com.techx.intervue.modules.notification.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.notification.NotificationTestSupport;
import com.techx.intervue.modules.notification.repositories.AnnouncementRepository;
import com.techx.intervue.modules.notification.repositories.NotificationRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class AnnouncementControllerTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;
    @Autowired NotificationRepository notifications;
    @Autowired AnnouncementRepository announcements;

    NotificationTestSupport api;
    User admin;
    User customer;
    User farmer;
    User suspendedCustomer;

    @BeforeEach
    void setUp() {
        api = new NotificationTestSupport(users, sessions, jwt, port);
        admin = api.user(RoleType.ADMIN);
        customer = api.user(RoleType.CUSTOMER);
        farmer = api.user(RoleType.FARMER);
        suspendedCustomer = api.user(RoleType.CUSTOMER, UserStatus.SUSPENDED);
    }

    @AfterEach
    void tearDown() {
        // announcements.created_by không cascade: xoá trước khi xoá admin
        announcements.findAll().stream()
                .filter(a -> a.getCreatedBy().equals(admin.getId()))
                .forEach(announcements::delete);
        api.cleanUp();
    }

    private HttpResponse<String> publish(User as, String json) {
        return api.send("POST", "/api/v1/admin/announcements", as, json);
    }

    private static long idOf(HttpResponse<String> r) {
        Matcher m = Pattern.compile("\"id\":(\\d+)").matcher(r.body());
        assertThat(m.find()).as(r.body()).isTrue();
        return Long.parseLong(m.group(1));
    }

    @Test
    void publishingToCustomersReachesEveryActiveCustomerOnly() {
        HttpResponse<String> r =
                publish(
                        admin,
                        """
                        {"title":"Closed Sunday","content":"Thảo Điền closes on 04/10","audience":"customers"}""");

        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        assertThat(r.body()).contains("\"audience\":\"customers\"").contains("\"active\":true");
        assertThat(notifications.countByUserIdAndReadFalse(customer.getId())).isEqualTo(1);
        assertThat(notifications.countByUserIdAndReadFalse(farmer.getId())).isZero();
        assertThat(notifications.countByUserIdAndReadFalse(suspendedCustomer.getId())).isZero();
        assertThat(notifications.countByUserIdAndReadFalse(admin.getId())).isZero();
        assertThat(api.send("GET", "/api/v1/notifications", customer, null).body())
                .contains("Closed Sunday")
                .contains("\"kind\":\"announcement\"")
                .contains("\"link\":\"/notifications\"");
    }

    @Test
    void publishingToEveryoneGivesFarmersTheirOwnLink() {
        publish(admin, "{\"title\":\"t\",\"content\":\"c\",\"audience\":\"all\"}");

        assertThat(api.send("GET", "/api/v1/notifications", farmer, null).body())
                .contains("\"link\":\"/farmer/notifications\"");
    }

    @Test
    void aCustomerCannotPublish() {
        assertThat(
                        publish(
                                        customer,
                                        "{\"title\":\"t\",\"content\":\"c\",\"audience\":\"all\"}")
                                .statusCode())
                .isEqualTo(403);
    }

    @Test
    void anUnknownAudienceIs400() {
        assertThat(
                        publish(
                                        admin,
                                        "{\"title\":\"t\",\"content\":\"c\",\"audience\":\"everyone\"}")
                                .statusCode())
                .isEqualTo(400);
    }

    @Test
    void aBlankTitleIs400() {
        assertThat(
                        publish(admin, "{\"title\":\" \",\"content\":\"c\",\"audience\":\"all\"}")
                                .statusCode())
                .isEqualTo(400);
    }

    @Test
    void anEndBeforeTheStartIs400() {
        HttpResponse<String> r =
                publish(
                        admin,
                        """
                        {"title":"t","content":"c","audience":"all",
                         "startsAt":"2026-10-01T10:00:00Z","endsAt":"2026-10-01T09:00:00Z"}""");

        assertThat(r.statusCode()).isEqualTo(400);
    }

    @Test
    void theLiveBannerIsPublicAndFollowsTheWindowAndTakeDown() {
        String past = Instant.now().minus(2, ChronoUnit.HOURS).toString();
        String hourAgo = Instant.now().minus(1, ChronoUnit.HOURS).toString();
        publish(
                admin,
                "{\"title\":\"Expired banner\",\"content\":\"c\",\"audience\":\"all\",\"startsAt\":\""
                        + past
                        + "\",\"endsAt\":\""
                        + hourAgo
                        + "\"}");
        HttpResponse<String> open =
                publish(
                        admin,
                        "{\"title\":\"Live banner\",\"content\":\"c\",\"audience\":\"all\"}");

        HttpResponse<String> live = api.send("GET", "/api/v1/announcements/active", null, null);
        assertThat(live.statusCode()).isEqualTo(200);
        assertThat(live.body()).contains("Live banner").doesNotContain("Expired banner");

        assertThat(
                        api.send("DELETE", "/api/v1/admin/announcements/" + idOf(open), admin, null)
                                .statusCode())
                .isEqualTo(200);
        assertThat(api.send("GET", "/api/v1/announcements/active", null, null).body())
                .doesNotContain("Live banner");
    }

    @Test
    void aFarmersOnlyBannerShowsToFarmersOnly() {
        publish(admin, "{\"title\":\"Farmers only\",\"content\":\"c\",\"audience\":\"farmers\"}");

        assertThat(api.send("GET", "/api/v1/announcements/active", null, null).body())
                .doesNotContain("Farmers only");
        assertThat(api.send("GET", "/api/v1/announcements/active", customer, null).body())
                .doesNotContain("Farmers only");
        assertThat(api.send("GET", "/api/v1/announcements/active", admin, null).body())
                .doesNotContain("Farmers only");
        assertThat(api.send("GET", "/api/v1/announcements/active", farmer, null).body())
                .contains("Farmers only");
    }

    @Test
    void aNewerBannerForOthersDoesNotHideTheOneForEveryone() {
        publish(admin, "{\"title\":\"For everyone\",\"content\":\"c\",\"audience\":\"all\"}");
        publish(
                admin,
                "{\"title\":\"Customers only\",\"content\":\"c\",\"audience\":\"customers\"}");

        assertThat(api.send("GET", "/api/v1/announcements/active", null, null).body())
                .contains("For everyone");
        assertThat(api.send("GET", "/api/v1/announcements/active", farmer, null).body())
                .contains("For everyone");
        assertThat(api.send("GET", "/api/v1/announcements/active", customer, null).body())
                .contains("Customers only");
    }

    @Test
    void editingChangesTheBannerButNotWhatWasSent() {
        long id =
                idOf(
                        publish(
                                admin,
                                "{\"title\":\"Old title\",\"content\":\"c\",\"audience\":\"all\"}"));

        HttpResponse<String> r =
                api.send(
                        "PUT",
                        "/api/v1/admin/announcements/" + id,
                        admin,
                        "{\"title\":\"New title\",\"content\":\"c\",\"audience\":\"all\"}");

        assertThat(r.statusCode()).isEqualTo(200);
        assertThat(r.body()).contains("New title");
        assertThat(api.send("GET", "/api/v1/notifications", customer, null).body())
                .contains("Old title")
                .doesNotContain("New title");
    }

    @Test
    void theAdminListShowsWhatWasPublished() {
        publish(admin, "{\"title\":\"Listed one\",\"content\":\"c\",\"audience\":\"farmers\"}");

        assertThat(api.send("GET", "/api/v1/admin/announcements", admin, null).body())
                .contains("Listed one");
    }

    @Test
    void editingAMissingAnnouncementIs404() {
        assertThat(
                        api.send(
                                        "PUT",
                                        "/api/v1/admin/announcements/999999999",
                                        admin,
                                        "{\"title\":\"t\",\"content\":\"c\",\"audience\":\"all\"}")
                                .statusCode())
                .isEqualTo(404);
    }
}
