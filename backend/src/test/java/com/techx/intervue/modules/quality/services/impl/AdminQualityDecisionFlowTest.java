package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import com.techx.intervue.modules.quality.services.interfaces.AdminQualityReportServiceInterface;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AdminQualityDecisionFlowTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired private AdminQualityReportServiceInterface decisions;
    @Autowired private ShelfLifeStandingServiceInterface standing;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long admin;
    private long farmer;
    private long category;
    private long order;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        long customer = fx.base.user("customer", "Buyer", "x");
        admin = fx.base.user("admin", "Admin", "x");
        farmer = fx.base.farmer(fx.base.user("farmer", "Seller", "x"), "Stall", "approved");
        category = fx.base.category();
        order =
                fx.base.order(
                        customer,
                        farmer,
                        fx.base.market("Market"),
                        "completed",
                        3,
                        TODAY.minusDays(3));
    }

    private long extendedLine(String name) {
        long product = fx.base.product(farmer, category, name, 1);
        fx.shelfLife(product, null, 5, 3);
        return fx.line(order, product, TODAY.plusDays(1), true);
    }

    private long productOf(long line) {
        return jdbc.queryForObject(
                "SELECT product_id FROM order_items WHERE id = ?", Long.class, line);
    }

    @Test
    void confirmingAnExtendedReportResetsTheProductAndRecordsAStrike() {
        long line = extendedLine("Rau muống");
        long report = fx.report(line, "open", true, 5);

        QualityReportResource decided = decisions.confirm(admin, report, "Lá úng đen trước hạn");

        assertThat(decided.status()).isEqualTo("confirmed");
        assertThat(decided.stallActiveStrikes()).isEqualTo(1);
        long product = productOf(line);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT shelf_life_days FROM products WHERE id = ?",
                                Integer.class,
                                product))
                .isEqualTo(3);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT shelf_life_extended FROM products WHERE id = ?",
                                Boolean.class,
                                product))
                .isFalse();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT shelf_life_ack_at FROM products WHERE id = ?",
                                Timestamp.class,
                                product))
                .isNull();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT COUNT(*) FROM farmer_violations WHERE quality_report_id = ?",
                                Integer.class,
                                report))
                .isEqualTo(1);
    }

    @Test
    void theThirdStrikeInNinetyDaysLocksTheStall() {
        fx.strike(fx.report(extendedLine("Cải ngọt"), "confirmed", true, 60), admin, 20);
        fx.strike(fx.report(extendedLine("Mồng tơi"), "confirmed", true, 50), admin, 10);
        fx.strike(fx.report(extendedLine("Rau dền"), "confirmed", true, 40), admin, 95);
        long open = fx.report(extendedLine("Rau muống"), "open", true, 5);
        Timestamp oldestCounting =
                jdbc.queryForObject(
                        "SELECT MIN(created_at) FROM farmer_violations WHERE farmer_id = ?"
                                + " AND created_at > NOW() - INTERVAL 90 DAY",
                        Timestamp.class,
                        farmer);

        decisions.confirm(admin, open, null);

        ShelfLifeStandingResource s = standing.standing(farmer);
        assertThat(s.activeViolations()).isEqualTo(3);
        assertThat(s.extensionLockedUntil())
                .isEqualTo(oldestCounting.toInstant().plus(Duration.ofDays(90)));
    }

    @Test
    void confirmingALineWithinItsSuggestionRecordsNothing() {
        long product = fx.base.product(farmer, category, "Rau lang", 1);
        long report = fx.report(fx.line(order, product, TODAY.plusDays(1), false), "open", true, 5);

        decisions.confirm(admin, report, null);

        assertThat(standing.standing(farmer).activeViolations()).isZero();
    }

    @Test
    void dismissingKeepsTheStallClean() {
        long report = fx.report(extendedLine("Rau muống"), "open", true, 5);

        QualityReportResource decided =
                decisions.dismiss(admin, report, "Khách để nhiệt độ thường.");

        assertThat(decided.status()).isEqualTo("dismissed");
        assertThat(standing.standing(farmer).activeViolations()).isZero();
    }
}
