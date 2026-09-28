package com.techx.intervue.modules.order.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.order.resources.OrderItemResource;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/** FR-121: order lines come back with their best-before day and how they are kept. */
@SpringBootTest
class OrderItemShelfLifeQueryTest {

    @Autowired private OrderQueryRepository orders;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void readsTheSnapshotColumnsAndLeavesOldLinesEmpty() {
        long customer = fx.user("customer", "Buyer " + fx.tag, "x");
        long farmer =
                fx.farmer(
                        fx.user("farmer", "Seller " + fx.tag, "x"), "Stall " + fx.tag, "approved");
        long market = fx.market("Market " + fx.tag);
        long category = fx.category();
        long fresh = fx.product(farmer, category, "Rau muống " + fx.tag, 1);
        long old = fx.product(farmer, category, "Cải ngọt " + fx.tag, 1);
        long order = fx.order(customer, farmer, market, "placed", 2, LocalDate.of(2026, 10, 3));
        fx.item(order, fresh, 1, 1);
        fx.item(order, old, 1, 1);
        jdbc.update(
                "UPDATE order_items SET best_before = '2026-10-05', storage_mode = 'chilled'"
                        + " WHERE order_id = ? AND product_id = ?",
                order,
                fresh);

        List<OrderItemResource> items = orders.items(order);

        assertThat(items.get(0).bestBefore()).isEqualTo("2026-10-05");
        assertThat(items.get(0).storageMode()).isEqualTo("chilled");
        assertThat(items.get(0).listPrice()).isNull();
        assertThat(items.get(1).bestBefore()).isNull();
        assertThat(items.get(1).storageMode()).isNull();
    }

    /** FR-122: each line carries its id (the report endpoint's {itemId}) and its report. */
    @Test
    void carriesTheLineIdAndItsSpoilageReport() {
        long customer = fx.user("customer", "Buyer " + fx.tag, "x");
        long farmer =
                fx.farmer(
                        fx.user("farmer", "Seller " + fx.tag, "x"), "Stall " + fx.tag, "approved");
        long market = fx.market("Market " + fx.tag);
        long category = fx.category();
        long reported = fx.product(farmer, category, "Rau dền " + fx.tag, 1);
        long quiet = fx.product(farmer, category, "Mồng tơi " + fx.tag, 1);
        long order = fx.order(customer, farmer, market, "completed", 2, LocalDate.of(2026, 10, 3));
        fx.item(order, reported, 1, 1);
        fx.item(order, quiet, 1, 1);
        long reportedLine =
                jdbc.queryForObject(
                        "SELECT id FROM order_items WHERE order_id = ? AND product_id = ?",
                        Long.class,
                        order,
                        reported);
        jdbc.update(
                "INSERT INTO quality_reports (order_item_id, order_id, customer_id, farmer_id,"
                        + " product_id, spoiled_on, problem, before_promise)"
                        + " VALUES (?, ?, ?, ?, ?, '2026-10-04', 'mold', TRUE)",
                reportedLine,
                order,
                customer,
                farmer,
                reported);

        List<OrderItemResource> items = orders.items(order);

        assertThat(items.get(0).itemId()).isEqualTo(reportedLine);
        ItemQualityReportResource report = items.get(0).qualityReport();
        assertThat(report.status()).isEqualTo("open");
        assertThat(report.spoiledOn()).isEqualTo("2026-10-04");
        assertThat(report.problem()).isEqualTo("mold");
        assertThat(items.get(1).itemId()).isNotNull();
        assertThat(items.get(1).qualityReport()).isNull();
    }
}
