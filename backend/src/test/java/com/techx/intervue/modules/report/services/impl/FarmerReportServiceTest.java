package com.techx.intervue.modules.report.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.report.resources.BestSellerResource;
import com.techx.intervue.modules.report.resources.FarmerDashboardResource;
import com.techx.intervue.modules.report.services.interfaces.FarmerReportServiceInterface;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * FR-068/069 on MySQL: the totals are SQL aggregates, so a mock could not prove which statuses
 * count. Stall A receives one order in every status; stall B has one completed order that must
 * never leak into A's numbers (Review Focus #3 at the report layer).
 */
@SpringBootTest
class FarmerReportServiceTest {

    @Autowired private FarmerReportServiceInterface reports;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;
    private long farmerAUserId;
    private long farmerBUserId;
    private long p1;
    private long p2;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        long category = fx.category();
        long market = fx.market("Market");
        long customer = fx.user("customer", "Report customer", "x");
        farmerAUserId = fx.user("farmer", "Farmer A", "x");
        farmerBUserId = fx.user("farmer", "Farmer B", "x");
        long farmerA = fx.farmer(farmerAUserId, "Stall A", "approved");
        long farmerB = fx.farmer(farmerBUserId, "Stall B", "approved");
        p1 = fx.product(farmerA, category, "Sold product", 10000);
        p2 = fx.product(farmerA, category, "Never sold product", 10000);
        long p3 = fx.product(farmerB, category, "Other stall product", 10000);
        LocalDate day = LocalDate.of(2026, 9, 20);

        fx.item(fx.order(customer, farmerA, market, "placed", 10000, day), p1, 10000, 1);
        fx.item(fx.order(customer, farmerA, market, "accepted", 20000, day), p1, 10000, 2);
        fx.order(customer, farmerA, market, "ready", 30000, day);
        fx.item(fx.order(customer, farmerA, market, "completed", 40000, day), p1, 10000, 2);
        fx.item(fx.order(customer, farmerA, market, "completed", 45000, day), p1, 10000, 3);
        fx.item(fx.order(customer, farmerA, market, "declined", 50000, day), p2, 10000, 5);
        fx.item(fx.order(customer, farmerA, market, "cancelled", 60000, day), p2, 10000, 4);
        fx.item(fx.order(customer, farmerB, market, "completed", 70000, day), p3, 10000, 7);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void revenueCountsOnlyCompletedOrders() {
        FarmerDashboardResource d = reports.dashboard(farmerAUserId);

        assertThat(d.revenueTotal()).isEqualByComparingTo("85000");
        assertThat(d.completedOrders()).isEqualTo(2);
    }

    @Test
    void pendingOrdersCountsOnlyPlaced() {
        assertThat(reports.dashboard(farmerAUserId).pendingOrders()).isEqualTo(1);
    }

    @Test
    void bestSellersSumsQuantityAcrossOrders() {
        List<BestSellerResource> best = reports.bestSellers(farmerAUserId, null, null, 10);

        assertThat(best).hasSize(1);
        assertThat(best.get(0).productId()).isEqualTo(p1);
        assertThat(best.get(0).quantitySold()).isEqualTo(5);
        assertThat(best.get(0).revenue()).isEqualByComparingTo("50000");
    }

    @Test
    void bestSellersIgnoresCancelledAndDeclinedOrders() {
        assertThat(reports.bestSellers(farmerAUserId, null, null, 10))
                .extracting(BestSellerResource::productId)
                .doesNotContain(p2);
    }

    @Test
    void dashboardOfOneFarmerNeverIncludesAnothersOrders() {
        FarmerDashboardResource a = reports.dashboard(farmerAUserId);
        FarmerDashboardResource b = reports.dashboard(farmerBUserId);

        assertThat(a.totalOrders()).isEqualTo(7);
        assertThat(b.totalOrders()).isEqualTo(1);
        assertThat(b.revenueTotal()).isEqualByComparingTo("70000");
        assertThat(reports.salesHistory(farmerBUserId, null, null, 1, 10).total()).isEqualTo(1);
    }

    /**
     * A stall approved today has no order at all: every SUM is NULL and MySQL types the COALESCE
     * fallback as an integer, not a DECIMAL — the dashboard must still be all zeros, not a 500.
     */
    @Test
    void dashboardOfAStallWithoutOrdersIsAllZeros() {
        long newFarmerUserId = fx.user("farmer", "Farmer new", "x");
        fx.farmer(newFarmerUserId, "Stall new", "approved");

        FarmerDashboardResource d = reports.dashboard(newFarmerUserId);

        assertThat(d.totalOrders()).isZero();
        assertThat(d.revenueTotal()).isEqualByComparingTo("0");
        assertThat(d.revenueThisMonth()).isEqualByComparingTo("0");
        assertThat(reports.bestSellers(newFarmerUserId, null, null, 5)).isEmpty();
    }
}
