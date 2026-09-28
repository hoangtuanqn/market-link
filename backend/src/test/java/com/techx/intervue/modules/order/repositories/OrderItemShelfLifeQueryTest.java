package com.techx.intervue.modules.order.repositories;

import static org.assertj.core.api.Assertions.assertThat;

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
}
