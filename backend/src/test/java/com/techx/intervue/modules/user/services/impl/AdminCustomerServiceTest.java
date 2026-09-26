package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.report.services.impl.ReportFixture;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * FR-072 on MySQL: deactivating a customer must block their next sign-in through the real {@code
 * UserService.authenticate}, and must not touch their orders.
 */
@SpringBootTest
class AdminCustomerServiceTest {

    private static final String PASSWORD = "Secret@123";

    @Autowired private AdminCustomerServiceInterface customers;
    @Autowired private UserServiceInterface users;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;
    private long customerId;
    private String email;
    private long orderId;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        long category = fx.category();
        long market = fx.market("Market");
        customerId = fx.user("customer", "Locked customer", passwordEncoder.encode(PASSWORD));
        email =
                jdbc.queryForObject(
                        "SELECT email FROM users WHERE id = ?", String.class, customerId);
        long farmer = fx.farmer(fx.user("farmer", "Farmer", "x"), "Stall", "approved");
        long product = fx.product(farmer, category, "Product", 10000);
        orderId = fx.order(customerId, farmer, market, "placed", 10000, LocalDate.of(2026, 10, 1));
        fx.item(orderId, product, 10000, 1);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void deactivatingACustomerBlocksTheirLogin() {
        assertThat(users.authenticate(new LoginRequest(email, PASSWORD, false, null))).isNotNull();

        AdminCustomerResource updated = customers.setStatus(customerId, "inactive");

        assertThat(updated.status()).isEqualTo("inactive");
        assertThatThrownBy(() -> users.authenticate(new LoginRequest(email, PASSWORD, false, null)))
                .isInstanceOf(DisabledException.class);

        customers.setStatus(customerId, "active");
        assertThat(users.authenticate(new LoginRequest(email, PASSWORD, false, null))).isNotNull();
    }

    @Test
    void deactivatingACustomerLeavesTheirOrdersAlone() {
        customers.setStatus(customerId, "inactive");

        String status =
                jdbc.queryForObject(
                        "SELECT status FROM orders WHERE id = ?", String.class, orderId);
        assertThat(status).isEqualTo("placed");
    }

    @Test
    void listShowsStatusAndOrderCount() {
        customers.setStatus(customerId, "inactive");

        PageResource<AdminCustomerResource> page = customers.list("inactive", fx.tag, 1, 20);

        assertThat(page.items()).hasSize(1);
        AdminCustomerResource row = page.items().get(0);
        assertThat(row.userId()).isEqualTo(customerId);
        assertThat(row.orderCount()).isEqualTo(1);
        assertThat(row.status()).isEqualTo("inactive");
    }

    @Test
    void statusChangeIsOnlyForCustomerAccounts() {
        long farmerUserId =
                jdbc.queryForObject(
                        "SELECT user_id FROM farmer_profiles WHERE stall_name = ?",
                        Long.class,
                        "Stall " + fx.tag);

        assertThatThrownBy(() -> customers.setStatus(farmerUserId, "inactive"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> customers.setStatus(customerId, "suspended"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
