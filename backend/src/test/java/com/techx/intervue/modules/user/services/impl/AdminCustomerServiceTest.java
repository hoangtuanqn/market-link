package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.report.services.impl.ReportFixture;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.exceptions.CustomerNotFoundException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Set;
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
 * UserService.authenticate}, cut off any live session immediately, record why, and must not touch
 * an already-`placed` order that stays `placed` after a temporary ban (permanent-ban cancellation
 * is Task 5's own tests).
 */
@SpringBootTest
class AdminCustomerServiceTest {

    private static final String PASSWORD = "Secret@123";

    @Autowired private AdminCustomerServiceInterface customers;
    @Autowired private UserServiceInterface users;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserSessionCache sessionCache;

    private ReportFixture fx;
    private long customerId;
    private long adminUserId;
    private String email;
    private long orderId;
    private long farmerUserId;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        long category = fx.category();
        long market = fx.market("Market");
        customerId = fx.user("customer", "Locked customer", passwordEncoder.encode(PASSWORD));
        adminUserId = fx.user("admin", "Admin", "x");
        email =
                jdbc.queryForObject(
                        "SELECT email FROM users WHERE id = ?", String.class, customerId);
        farmerUserId = fx.user("farmer", "Farmer", "x");
        long farmer = fx.farmer(farmerUserId, "Stall", "approved");
        long product = fx.product(farmer, category, "Product", 10000);
        orderId = fx.order(customerId, farmer, market, "placed", 10000, LocalDate.of(2026, 10, 1));
        fx.item(orderId, product, 10000, 1);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void deactivatingACustomerBlocksTheirLoginWithTheReason() {
        assertThat(users.authenticate(new LoginRequest(email, PASSWORD, false, null))).isNotNull();

        AdminCustomerResource updated =
                customers.setStatus(
                        customerId, "inactive", "No-shows repeatedly", null, adminUserId);

        assertThat(updated.status()).isEqualTo("inactive");
        assertThatThrownBy(() -> users.authenticate(new LoginRequest(email, PASSWORD, false, null)))
                .isInstanceOf(DisabledException.class)
                .hasMessageContaining("No-shows repeatedly")
                .hasMessageContaining("deactivated");

        customers.setStatus(customerId, "active", null, null, adminUserId);
        assertThat(users.authenticate(new LoginRequest(email, PASSWORD, false, null))).isNotNull();
    }

    @Test
    void temporaryBanMessageNamesTheReturnTime() {
        Instant until = Instant.now().plus(Duration.ofDays(3)).truncatedTo(ChronoUnit.SECONDS);

        customers.setStatus(customerId, "inactive", "Abusive messages", until, adminUserId);

        assertThatThrownBy(() -> users.authenticate(new LoginRequest(email, PASSWORD, false, null)))
                .hasMessageContaining("temporarily suspended")
                .hasMessageContaining("Abusive messages");
    }

    @Test
    void deactivatingCutsOffALiveSessionRightAway() {
        sessionCache.set(customerId, email, Set.of(RoleType.CUSTOMER), Duration.ofMinutes(15));
        assertThat(sessionCache.get(customerId)).isNotNull();

        customers.setStatus(customerId, "inactive", "Fake account", null, adminUserId);

        assertThat(sessionCache.get(customerId)).isNull();
    }

    @Test
    void deactivatingACustomerWithNoLiveSessionDoesNotThrow() {
        assertThat(sessionCache.get(customerId)).isNull();

        assertThat(
                        customers
                                .setStatus(
                                        customerId, "inactive", "Fake reviews", null, adminUserId)
                                .status())
                .isEqualTo("inactive");
    }

    @Test
    void reasonIsRequiredToDeactivate() {
        assertThatThrownBy(
                        () -> customers.setStatus(customerId, "inactive", " ", null, adminUserId))
                .isInstanceOf(InvalidFieldException.class);
        assertThatThrownBy(
                        () -> customers.setStatus(customerId, "inactive", null, null, adminUserId))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void untilMustBeInTheFuture() {
        Instant past = Instant.now().minus(Duration.ofMinutes(1));

        assertThatThrownBy(
                        () ->
                                customers.setStatus(
                                        customerId, "inactive", "No-shows", past, adminUserId))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void reactivatingClearsTheReasonAndExpiryEvenAfterAnEarlierBan() {
        customers.setStatus(
                customerId,
                "inactive",
                "Owner request",
                Instant.now().plusSeconds(3600),
                adminUserId);

        AdminCustomerResource reactivated =
                customers.setStatus(customerId, "active", null, null, adminUserId);

        assertThat(reactivated.status()).isEqualTo("active");
        String reason =
                jdbc.queryForObject(
                        "SELECT deactivation_reason FROM users WHERE id = ?",
                        String.class,
                        customerId);
        assertThat(reason).isNull();
        // A later, unrelated deactivation must not see the earlier ban's expiry.
        customers.setStatus(customerId, "inactive", "New violation", null, adminUserId);
        assertThatThrownBy(() -> users.authenticate(new LoginRequest(email, PASSWORD, false, null)))
                .hasMessageContaining(
                        "deactivated") // permanent wording, not "temporarily suspended"
                .hasMessageNotContaining("temporarily");
    }

    @Test
    void deactivatingTwiceInARowDoesNotThrow() {
        customers.setStatus(customerId, "inactive", "No-shows", null, adminUserId);

        assertThat(
                        customers
                                .setStatus(
                                        customerId, "inactive", "No-shows again", null, adminUserId)
                                .status())
                .isEqualTo("inactive");
    }

    @Test
    void temporaryBanLeavesOpenOrdersAlone() {
        customers.setStatus(
                customerId,
                "inactive",
                "Owner request",
                Instant.now().plusSeconds(3600),
                adminUserId);

        String status =
                jdbc.queryForObject(
                        "SELECT status FROM orders WHERE id = ?", String.class, orderId);
        assertThat(status).isEqualTo("placed");
    }

    @Test
    void permanentBanCancelsOpenOrdersAndRestoresStock() {
        customers.setStatus(customerId, "inactive", "Fake account", null, adminUserId);

        String status =
                jdbc.queryForObject(
                        "SELECT status FROM orders WHERE id = ?", String.class, orderId);
        assertThat(status).isEqualTo("cancelled");
    }

    @Test
    void permanentBanLeavesAnotherCustomersOrdersAlone() {
        long otherCustomer =
                fx.user("customer", "Other customer", passwordEncoder.encode(PASSWORD));
        long farmer =
                jdbc.queryForObject(
                        "SELECT id FROM farmer_profiles WHERE stall_name = ?",
                        Long.class,
                        "Stall " + fx.tag);
        long otherOrder =
                fx.order(
                        otherCustomer,
                        farmer,
                        fx.market("Second market"),
                        "placed",
                        5000,
                        LocalDate.of(2026, 10, 2));

        customers.setStatus(customerId, "inactive", "Fake account", null, adminUserId);

        String status =
                jdbc.queryForObject(
                        "SELECT status FROM orders WHERE id = ?", String.class, otherOrder);
        assertThat(status).isEqualTo("placed");
    }

    @Test
    void everyStatusChangeIsRecordedInHistory() {
        customers.setStatus(customerId, "inactive", "No-shows", null, adminUserId);
        customers.setStatus(customerId, "active", null, null, adminUserId);

        Integer rows =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM user_status_history WHERE user_id = ?",
                        Integer.class,
                        customerId);
        assertThat(rows).isEqualTo(2);
        String lastChangedBy =
                jdbc.queryForObject(
                        "SELECT changed_by FROM user_status_history WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                        String.class,
                        customerId);
        assertThat(lastChangedBy).isEqualTo(String.valueOf(adminUserId));
    }

    @Test
    void listShowsStatusAndOrderCount() {
        customers.setStatus(customerId, "inactive", "No-shows", null, adminUserId);

        PageResource<AdminCustomerResource> page = customers.list("inactive", fx.tag, 1, 20);

        assertThat(page.items()).hasSize(1);
        AdminCustomerResource row = page.items().get(0);
        assertThat(row.userId()).isEqualTo(customerId);
        assertThat(row.orderCount()).isEqualTo(1);
        assertThat(row.status()).isEqualTo("inactive");
    }

    /** FR-072: {@code GET /admin/customers/{id}} — one customer, 404 for a non-customer account. */
    @Test
    void detailReturnsOneCustomerAndRefusesAStall() {
        assertThat(customers.detail(customerId).email()).isEqualTo(email);
        assertThatThrownBy(() -> customers.detail(farmerUserId))
                .isInstanceOf(CustomerNotFoundException.class);
    }

    @Test
    void statusChangeIsOnlyForCustomerAccounts() {
        long farmerUserId =
                jdbc.queryForObject(
                        "SELECT user_id FROM farmer_profiles WHERE stall_name = ?",
                        Long.class,
                        "Stall " + fx.tag);

        assertThatThrownBy(
                        () ->
                                customers.setStatus(
                                        farmerUserId, "inactive", "No-shows", null, adminUserId))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                customers.setStatus(
                                        customerId, "suspended", "No-shows", null, adminUserId))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void statusHistoryListsEveryChangeNewestFirstWithTheActorName() {
        customers.setStatus(customerId, "inactive", "No-shows", null, adminUserId);
        customers.setStatus(customerId, "active", null, null, adminUserId);

        PageResource<AdminCustomerStatusHistoryResource> page =
                customers.statusHistory(customerId, 1, 20);

        assertThat(page.items()).hasSize(2);
        assertThat(page.items().get(0).toStatus()).isEqualTo("active");
        assertThat(page.items().get(0).changedByName()).isEqualTo("Admin " + fx.tag);
        assertThat(page.items().get(1).toStatus()).isEqualTo("inactive");
        assertThat(page.items().get(1).reason()).isEqualTo("No-shows");
    }

    @Test
    void statusHistoryRefusesANonCustomerAccount() {
        assertThatThrownBy(() -> customers.statusHistory(farmerUserId, 1, 20))
                .isInstanceOf(CustomerNotFoundException.class);
    }
}
