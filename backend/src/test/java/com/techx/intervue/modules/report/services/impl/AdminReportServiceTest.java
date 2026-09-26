package com.techx.intervue.modules.report.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.resources.AdminDashboardResource;
import com.techx.intervue.modules.report.resources.RevenueByMarketResource;
import com.techx.intervue.modules.report.resources.TopFarmerResource;
import com.techx.intervue.modules.report.services.interfaces.AdminReportServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * FR-070/075 on MySQL. The database also holds the demo seed, so platform-wide numbers are checked
 * against direct SQL counts, and per-market numbers on markets this test creates.
 */
@SpringBootTest
class AdminReportServiceTest {

    @Autowired private AdminReportServiceInterface reports;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;
    private long m1;
    private long m2;
    private long farmerA;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        long category = fx.category();
        m1 = fx.market("Market one");
        m2 = fx.market("Market two");
        long customer = fx.user("customer", "Report customer", "x");
        farmerA = fx.farmer(fx.user("farmer", "Farmer A", "x"), "Stall A", "approved");
        fx.farmer(fx.user("farmer", "Farmer C", "x"), "Stall C", "pending");
        long p1 = fx.product(farmerA, category, "Product", 10000);
        LocalDate day = LocalDate.of(2026, 9, 20);

        fx.item(fx.order(customer, farmerA, m1, "completed", 40000, day), p1, 10000, 4);
        fx.item(fx.order(customer, farmerA, m1, "placed", 10000, day), p1, 10000, 1);
        fx.item(fx.order(customer, farmerA, m2, "completed", 30000, day), p1, 10000, 3);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void dashboardCountsOnlyApprovedFarmers() {
        AdminDashboardResource d = reports.dashboard();

        assertThat(d.totalFarmers())
                .isEqualTo(count("farmer_profiles WHERE approval_status = 'approved'"));
        assertThat(d.pendingFarmers())
                .isEqualTo(count("farmer_profiles WHERE approval_status = 'pending'"))
                .isGreaterThanOrEqualTo(1);
        assertThat(d.totalCustomers()).isEqualTo(count("users WHERE role = 'customer'"));
        assertThat(d.totalMarkets()).isEqualTo(count("markets WHERE is_active = TRUE"));
        assertThat(d.totalOrders()).isEqualTo(count("orders"));
    }

    @Test
    void dashboardRevenueMatchesSumOfCompletedOrders() {
        BigDecimal completed =
                jdbc.queryForObject(
                        "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status ="
                                + " 'completed'",
                        BigDecimal.class);

        assertThat(reports.dashboard().revenueTotal()).isEqualByComparingTo(completed);
        BigDecimal byMarket =
                reports.revenueByMarket(null, null).stream()
                        .map(RevenueByMarketResource::revenue)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(byMarket).isEqualByComparingTo(completed);
    }

    @Test
    void revenueByMarketGroupsCorrectly() {
        List<RevenueByMarketResource> rows = reports.revenueByMarket(null, null);

        RevenueByMarketResource one = rowFor(rows, m1);
        RevenueByMarketResource two = rowFor(rows, m2);
        assertThat(one.revenue()).isEqualByComparingTo("40000");
        assertThat(one.orderCount()).isEqualTo(1);
        assertThat(two.revenue()).isEqualByComparingTo("30000");
    }

    @Test
    void topFarmersOrdersByRevenueDescending() {
        List<TopFarmerResource> top = reports.topFarmers(null, null, 50);

        assertThat(top).isNotEmpty();
        for (int i = 1; i < top.size(); i++) {
            assertThat(top.get(i - 1).revenue()).isGreaterThanOrEqualTo(top.get(i).revenue());
        }
        TopFarmerResource a =
                top.stream().filter(t -> t.farmerId() == farmerA).findFirst().orElseThrow();
        assertThat(a.revenue()).isEqualByComparingTo("70000");
        assertThat(a.orderCount()).isEqualTo(2);
    }

    @Test
    void reportsAcceptAnEmptyDateRange() {
        List<RevenueByMarketResource> all = reports.revenueByMarket(null, null);
        List<RevenueByMarketResource> wide =
                reports.revenueByMarket(LocalDate.of(2000, 1, 1), LocalDate.of(2100, 1, 1));

        assertThat(all).isEqualTo(wide);
        assertThat(reports.topFarmers(null, null, 5)).isNotNull();
        assertThat(reports.orders(null, null, null, null, 1, 10).total())
                .isEqualTo(count("orders"));
    }

    @Test
    void ordersReportFiltersByMarketAndDate() {
        PageResource<OrderListItemResource> page = reports.orders(null, null, m1, null, 1, 10);

        assertThat(page.total()).isEqualTo(2);
        assertThat(page.items()).allMatch(o -> o.marketId() == m1);
        assertThat(reports.orders(LocalDate.of(2026, 9, 21), null, m1, null, 1, 10).total())
                .isZero();
    }

    private long count(String fromWhere) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM " + fromWhere, Long.class);
        return n == null ? 0 : n;
    }

    private static RevenueByMarketResource rowFor(List<RevenueByMarketResource> rows, long id) {
        return rows.stream().filter(r -> r.marketId() == id).findFirst().orElseThrow();
    }
}
