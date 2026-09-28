package com.techx.intervue.modules.quality.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityProblem;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-122, FR-123: the report and strike tables and their finders, against real MySQL. */
@SpringBootTest
@Transactional
class QualityReportRepositoryTest {

    private static final LocalDate PICKUP = LocalDate.of(2026, 10, 3);

    @Autowired private QualityReportRepository reports;
    @Autowired private FarmerViolationRepository violations;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long customer;
    private long farmer;
    private long admin;
    private long category;
    private long order;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        customer = fx.base.user("customer", "Buyer", "x");
        farmer = fx.base.farmer(fx.base.user("farmer", "Seller", "x"), "Stall", "approved");
        admin = fx.base.user("admin", "Admin", "x");
        category = fx.base.category();
        order = fx.base.order(customer, farmer, fx.base.market("Market"), "completed", 3, PICKUP);
    }

    /** Spec §4.4.1: each line is reported once — UNIQUE (order_item_id). */
    @Test
    void oneOrderLineIsReportedOnlyOnce() {
        long item = fx.line(order, product("Rau muống"), PICKUP.plusDays(4), true);
        reports.saveAndFlush(report(item));

        assertThat(reports.existsByOrderItemId(item)).isTrue();
        assertThatThrownBy(() -> reports.saveAndFlush(report(item)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aLineNobodyReportedIsNotReported() {
        long item = fx.line(order, product("Cải ngọt"), PICKUP.plusDays(2), false);

        assertThat(reports.existsByOrderItemId(item)).isFalse();
    }

    /** Spec §4.4.4: a strike counts for 90 days; the newest comes first. */
    @Test
    void onlyStrikesOfTheLast90DaysCountNewestFirst() {
        fx.strike(
                fx.report(fx.line(order, product("A"), PICKUP, true), "confirmed", true, 3),
                admin,
                91);
        fx.strike(
                fx.report(fx.line(order, product("B"), PICKUP, true), "confirmed", true, 2),
                admin,
                10);
        fx.strike(
                fx.report(fx.line(order, product("C"), PICKUP, true), "confirmed", true, 1),
                admin,
                1);

        List<Instant> active =
                violations.activeTimes(farmer, Instant.now().minus(Duration.ofDays(90)));

        assertThat(active).hasSize(2);
        assertThat(active.get(0)).isAfter(active.get(1));
    }

    /** V20260928014: a decided report always says when it was decided. */
    @Test
    void aDecidedReportWithoutADecisionTimeIsRefused() {
        long item = fx.line(order, product("D"), PICKUP.plusDays(4), true);

        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "INSERT INTO quality_reports (order_item_id, order_id,"
                                                + " customer_id, farmer_id, product_id,"
                                                + " spoiled_on, problem, before_promise, status)"
                                                + " SELECT oi.id, oi.order_id, ?, ?,"
                                                + " oi.product_id, '2026-10-05', 'mold', TRUE,"
                                                + " 'confirmed' FROM order_items oi WHERE oi.id = ?",
                                        customer,
                                        farmer,
                                        item))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("ck_quality_reports_decision");
    }

    /** The lock the admin decision and the stall's reply both go through. */
    @Test
    void lockByIdReadsTheReport() {
        long item = fx.line(order, product("E"), PICKUP.plusDays(4), true);
        long id = reports.saveAndFlush(report(item)).getId();

        assertThat(reports.lockById(id))
                .map(QualityReport::getStatus)
                .contains(QualityReportStatus.OPEN);
    }

    private long product(String name) {
        return fx.base.product(farmer, category, name, 1);
    }

    private QualityReport report(long itemId) {
        QualityReport r = new QualityReport();
        r.setOrderItemId(itemId);
        r.setOrderId(order);
        r.setCustomerId(customer);
        r.setFarmerId(farmer);
        r.setProductId(
                jdbc.queryForObject(
                        "SELECT product_id FROM order_items WHERE id = ?", Long.class, itemId));
        r.setSpoiledOn(PICKUP.plusDays(2));
        r.setProblem(QualityProblem.MOLD);
        r.setBeforePromise(true);
        r.setShelfLifeExtended(true);
        r.setExtendedByDays(2);
        r.setCreatedAt(Instant.now());
        return r;
    }
}
