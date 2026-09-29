package com.techx.intervue.modules.farmer.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.requests.SuspendFarmerRequest;
import com.techx.intervue.modules.farmer.resources.AdminFarmerStatusHistoryResource;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import com.techx.intervue.modules.product.services.interfaces.ProductServiceInterface;
import com.techx.intervue.modules.product.services.interfaces.StockTemplateServiceInterface;
import com.techx.intervue.modules.report.services.impl.FarmerReportService;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import com.techx.intervue.modules.stall.requests.StallProfileRequest;
import com.techx.intervue.modules.stall.requests.UpdateSlotRequest;
import com.techx.intervue.modules.stall.services.interfaces.SlotServiceInterface;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.resources.PageResource;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class FarmerSuspensionTest {

    @Autowired private FarmerServiceInterface farmers;
    @Autowired private OrderServiceInterface orders;
    @Autowired private UserSessionCache sessionCache;
    @Autowired private ProductServiceInterface products;
    @Autowired private StockTemplateServiceInterface stockTemplates;
    @Autowired private FarmerReportService farmerReports;
    @Autowired private StallServiceInterface stalls;
    @Autowired private SlotServiceInterface slots;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;
    private long farmerUserId;
    private long farmerId;
    private long adminUserId;
    private String farmerEmail;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        farmerUserId = fx.user("farmer", "Suspended farmer", "x");
        adminUserId = fx.user("admin", "Admin", "x");
        farmerId = fx.farmer(farmerUserId, "Stall", "approved");
        farmerEmail =
                jdbc.queryForObject(
                        "SELECT email FROM users WHERE id = ?", String.class, farmerUserId);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    private SuspendFarmerRequest permanent(String reason) {
        return new SuspendFarmerRequest(reason, null);
    }

    @Test
    void suspendingStoresTheDurationAndWritesOneHistoryRow() {
        Instant until = Instant.now().plus(Duration.ofDays(3));

        farmers.suspend(farmerId, new SuspendFarmerRequest("Missed pickups", until), adminUserId);

        String status =
                jdbc.queryForObject(
                        "SELECT approval_status FROM farmer_profiles WHERE id = ?",
                        String.class,
                        farmerId);
        assertThat(status).isEqualTo("suspended");
        assertThat(
                        jdbc.queryForObject(
                                "SELECT suspended_until IS NOT NULL FROM farmer_profiles WHERE id = ?",
                                Boolean.class,
                                farmerId))
                .isTrue();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT COUNT(*) FROM farmer_status_history WHERE farmer_id = ?",
                                Integer.class,
                                farmerId))
                .isEqualTo(1);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT changed_by FROM farmer_status_history WHERE farmer_id = ?",
                                Long.class,
                                farmerId))
                .isEqualTo(adminUserId);
    }

    @Test
    void suspendingCutsOffALiveSessionRightAway() {
        sessionCache.set(
                farmerUserId, farmerEmail, Set.of(RoleType.FARMER), Duration.ofMinutes(15));
        assertThat(sessionCache.get(farmerUserId)).isNotNull();

        farmers.suspend(farmerId, permanent("Complaints"), adminUserId);

        assertThat(sessionCache.get(farmerUserId)).isNull();
    }

    @Test
    void suspendingAFarmerWithNoLiveSessionDoesNotThrow() {
        assertThat(sessionCache.get(farmerUserId)).isNull();

        assertThatCode(() -> farmers.suspend(farmerId, permanent("Rules broken"), adminUserId))
                .doesNotThrowAnyException();
    }

    @Test
    void anEndTimeInThePastIsRefused() {
        Instant past = Instant.now().minus(Duration.ofMinutes(1));

        assertThatThrownBy(
                        () ->
                                farmers.suspend(
                                        farmerId,
                                        new SuspendFarmerRequest("Complaints", past),
                                        adminUserId))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void reinstatingClearsTheExpiryTooSoALaterBanDoesNotInheritIt() {
        farmers.suspend(
                farmerId,
                new SuspendFarmerRequest("Owner request", Instant.now().plusSeconds(3600)),
                adminUserId);

        farmers.reinstate(farmerId, adminUserId);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT suspended_until IS NULL AND suspend_reason IS NULL"
                                        + " FROM farmer_profiles WHERE id = ?",
                                Boolean.class,
                                farmerId))
                .isTrue();

        farmers.suspend(farmerId, permanent("New violation"), adminUserId);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT suspended_until IS NULL FROM farmer_profiles WHERE id = ?",
                                Boolean.class,
                                farmerId))
                .isTrue();
    }

    @Test
    void bothSuspendAndReinstateAreRecorded() {
        farmers.suspend(farmerId, permanent("No-shows"), adminUserId);
        farmers.reinstate(farmerId, adminUserId);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT COUNT(*) FROM farmer_status_history WHERE farmer_id = ?",
                                Integer.class,
                                farmerId))
                .isEqualTo(2);
    }

    @Test
    void aSuspendedStallCannotReadItsSellingScreens() {
        farmers.suspend(farmerId, permanent("Complaints"), adminUserId);

        assertThatThrownBy(() -> products.mine(farmerUserId, null, 1, 20))
                .isInstanceOf(StallSuspendedException.class)
                .hasMessageContaining("Complaints");
        assertThatThrownBy(() -> stockTemplates.list(farmerUserId))
                .isInstanceOf(StallSuspendedException.class);
        assertThatThrownBy(() -> farmerReports.dashboard(farmerUserId))
                .isInstanceOf(StallSuspendedException.class);
    }

    @Test
    void aSuspendedStallCannotWriteToItsProfileMarketsOrSlots() {
        long market = fx.market("Market");
        fx.openSlot(farmerId, market, LocalDate.now().plusDays(3));
        long farmerMarketId =
                jdbc.queryForObject(
                        "SELECT id FROM farmer_markets WHERE farmer_id = ?", Long.class, farmerId);
        long slotId =
                jdbc.queryForObject(
                        "SELECT id FROM pickup_slots WHERE farmer_market_id = ?",
                        Long.class,
                        farmerMarketId);

        farmers.suspend(farmerId, permanent("Complaints"), adminUserId);

        assertThatThrownBy(
                        () ->
                                stalls.updateProfile(
                                        farmerUserId,
                                        new StallProfileRequest(
                                                "New name", "Contact", null, null, 12)))
                .isInstanceOf(StallSuspendedException.class);
        assertThatThrownBy(() -> stalls.leaveMarket(farmerUserId, farmerMarketId))
                .isInstanceOf(StallSuspendedException.class);
        assertThatThrownBy(
                        () ->
                                slots.updateSlot(
                                        farmerUserId, slotId, new UpdateSlotRequest(10, null)))
                .isInstanceOf(StallSuspendedException.class);
    }

    @Test
    void aSuspendedStallCanStillReadItsOwnProfileAndReason() {
        farmers.suspend(farmerId, permanent("Complaints"), adminUserId);

        assertThatCode(() -> stalls.myProfile(farmerUserId)).doesNotThrowAnyException();
    }

    @Test
    void aSuspendedStallCanStillCompleteAnOrderItAlreadyAccepted() {
        long market = fx.market("Market");
        long category = fx.category();
        long customerId = fx.user("customer", "Buyer", "x");
        long product = fx.product(farmerId, category, "Product", 10000);
        long orderId =
                fx.order(
                        customerId, farmerId, market, "accepted", 10000, LocalDate.of(2026, 10, 1));
        fx.item(orderId, product, 10000, 1);

        farmers.suspend(farmerId, permanent("Complaints"), adminUserId);

        assertThatCode(() -> orders.markReady(farmerUserId, orderId)).doesNotThrowAnyException();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT status FROM orders WHERE id = ?", String.class, orderId))
                .isEqualTo("ready");
    }

    @Test
    void statusHistoryListsEveryChangeNewestFirstWithTheActorName() {
        farmers.suspend(farmerId, permanent("No-shows"), adminUserId);
        farmers.reinstate(farmerId, adminUserId);

        PageResource<AdminFarmerStatusHistoryResource> page =
                farmers.statusHistory(farmerId, 1, 20);

        assertThat(page.items()).hasSize(2);
        assertThat(page.items().get(0).toStatus()).isEqualTo("approved");
        assertThat(page.items().get(0).changedByName()).isEqualTo("Admin " + fx.tag);
        assertThat(page.items().get(1).toStatus()).isEqualTo("suspended");
        assertThat(page.items().get(1).reason()).isEqualTo("No-shows");
    }

    @Test
    void statusHistoryRefusesAnUnknownFarmerId() {
        assertThatThrownBy(() -> farmers.statusHistory(999_999L, 1, 20))
                .isInstanceOf(FarmerProfileNotFoundException.class);
    }
}
