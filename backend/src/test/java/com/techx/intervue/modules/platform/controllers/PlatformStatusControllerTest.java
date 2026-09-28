package com.techx.intervue.modules.platform.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.platform.PlatformTestSupport;
import com.techx.intervue.modules.platform.repositories.PlatformStatusRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.AdminMfaRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

/**
 * FR-008-adjacent: site-wide maintenance mode. Verifies both the admin toggle and the actual
 * enforcement (MaintenanceModeFilter) — a 503 for everyone but an authenticated admin.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class PlatformStatusControllerTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired AdminMfaRepository adminMfa;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;
    @Autowired PlatformStatusRepository statuses;

    PlatformTestSupport api;
    User admin;
    User customer;

    @BeforeEach
    void setUp() {
        api = new PlatformTestSupport(users, sessions, jwt, adminMfa, port);
        admin = api.user(RoleType.ADMIN);
        customer = api.user(RoleType.CUSTOMER);
    }

    @AfterEach
    void tearDown() {
        // A test that fails mid-way must never leave maintenance mode on for every other test.
        statuses.findById(1)
                .ifPresent(
                        row -> {
                            row.setMaintenanceMode(false);
                            row.setUpdatedBy(null);
                            statuses.save(row);
                        });
        api.cleanUp();
    }

    @Test
    void defaultsToOpenAndOnlyAdminCanToggleIt() {
        HttpResponse<String> initial = api.send("GET", "/api/v1/platform/status", null, null);
        assertThat(initial.statusCode()).as(initial.body()).isEqualTo(200);
        assertThat(initial.body()).contains("\"maintenanceMode\":false");

        HttpResponse<String> forbidden =
                api.send(
                        "PUT",
                        "/api/v1/admin/platform/status",
                        customer,
                        """
                        {"maintenanceMode":true}""");
        assertThat(forbidden.statusCode()).as(forbidden.body()).isEqualTo(403);

        HttpResponse<String> turnedOn =
                api.send(
                        "PUT",
                        "/api/v1/admin/platform/status",
                        admin,
                        """
                        {"maintenanceMode":true}""");
        assertThat(turnedOn.statusCode()).as(turnedOn.body()).isEqualTo(200);
        assertThat(turnedOn.body()).contains("\"maintenanceMode\":true");
    }

    @Test
    void maintenanceModeLocksOutEveryoneButAdmin() {
        api.send(
                "PUT",
                "/api/v1/admin/platform/status",
                admin,
                """
                {"maintenanceMode":true}""");

        HttpResponse<String> guest = api.send("GET", "/api/v1/markets", null, null);
        assertThat(guest.statusCode()).as(guest.body()).isEqualTo(503);
        assertThat(guest.body()).contains("MAINTENANCE_MODE");

        HttpResponse<String> asCustomer = api.send("GET", "/api/v1/notifications", customer, null);
        assertThat(asCustomer.statusCode()).as(asCustomer.body()).isEqualTo(503);

        HttpResponse<String> asAdmin = api.send("GET", "/api/v1/notifications", admin, null);
        assertThat(asAdmin.statusCode()).as(asAdmin.body()).isEqualTo(200);

        // the status endpoint itself must stay reachable so the frontend can poll it
        HttpResponse<String> status = api.send("GET", "/api/v1/platform/status", null, null);
        assertThat(status.statusCode()).as(status.body()).isEqualTo(200);

        api.send(
                "PUT",
                "/api/v1/admin/platform/status",
                admin,
                """
                {"maintenanceMode":false}""");

        HttpResponse<String> reopened = api.send("GET", "/api/v1/markets", null, null);
        assertThat(reopened.statusCode()).as(reopened.body()).isEqualTo(200);
    }
}
