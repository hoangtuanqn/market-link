package com.techx.intervue.modules.order.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.platform.PlatformTestSupport;
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
 * FR-125: POST /orders/preview checks every {@code pickupDates} entry before the service reads it,
 * so a malformed cart is a 400 VALIDATION_ERROR rather than a 500.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class OrderPreviewValidationTest {

    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired AdminMfaRepository adminMfa;
    @Autowired UserSessionCache sessions;
    @Autowired JwtServiceInterface jwt;

    private PlatformTestSupport api;
    private User customer;

    @BeforeEach
    void setUp() {
        api = new PlatformTestSupport(users, sessions, jwt, adminMfa, port);
        customer = api.user(RoleType.CUSTOMER);
    }

    @AfterEach
    void tearDown() {
        api.cleanUp();
    }

    @Test
    void aNullPickupDateEntryIs400() {
        HttpResponse<String> r =
                api.send(
                        "POST",
                        "/api/v1/orders/preview",
                        customer,
                        """
                        {"items":[{"productId":1,"quantity":1}],"pickupDates":[null]}""");

        assertThat(r.statusCode()).as(r.body()).isEqualTo(400);
        assertThat(r.body()).contains("\"VALIDATION_ERROR\"").contains("pickupDates[0]");
    }
}
