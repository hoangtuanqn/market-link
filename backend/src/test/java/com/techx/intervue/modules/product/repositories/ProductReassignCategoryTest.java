package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.report.services.impl.ReportFixture;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * FR-076 x FR-120: moving a category's products to another category clears their storage group,
 * which belonged to the old category, and keeps the shelf-life numbers as they were saved.
 */
@SpringBootTest
class ProductReassignCategoryTest {

    @Autowired private ProductRepository products;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;
    private ReportFixture target;
    private long from;
    private long to;
    private long product;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        target = new ReportFixture(jdbc);
        from = fx.category();
        to = target.category();
        long farmer =
                fx.farmer(fx.user("farmer", "Move " + fx.tag, "x"), "Stall " + fx.tag, "approved");
        jdbc.update(
                "INSERT INTO shelf_life_guides (category_id, group_name, storage_mode,"
                        + " suggested_days) VALUES (?, 'Leafy greens', 'chilled', 3)",
                from);
        long guide =
                jdbc.queryForObject(
                        "SELECT id FROM shelf_life_guides WHERE category_id = ?", Long.class, from);
        product = fx.product(farmer, from, "Rau muống", 1);
        jdbc.update(
                "UPDATE products SET shelf_life_days = 5, shelf_life_guide_id = ?, storage_mode ="
                        + " 'chilled', suggested_shelf_life_days = 3, shelf_life_extended = TRUE,"
                        + " shelf_life_ack_at = '2026-09-20 08:30:00' WHERE id = ?",
                guide,
                product);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("UPDATE products SET shelf_life_guide_id = NULL WHERE id = ?", product);
        jdbc.update("DELETE FROM shelf_life_guides WHERE category_id = ?", from);
        fx.cleanUp();
        target.cleanUp();
    }

    @Test
    void movesTheProductClearsItsGroupAndKeepsItsShelfLife() {
        new TransactionTemplate(txManager)
                .executeWithoutResult(status -> products.reassignCategory(from, to));

        Map<String, Object> row =
                jdbc.queryForMap(
                        "SELECT category_id, shelf_life_guide_id, storage_mode, shelf_life_days,"
                                + " suggested_shelf_life_days, shelf_life_extended,"
                                + " DATE_FORMAT(shelf_life_ack_at, '%Y-%m-%d %H:%i:%s') AS ack_at"
                                + " FROM products WHERE id = ?",
                        product);
        assertThat(((Number) row.get("category_id")).longValue()).isEqualTo(to);
        assertThat(row.get("shelf_life_guide_id")).isNull();
        assertThat(row.get("storage_mode")).isEqualTo("chilled");
        assertThat(((Number) row.get("shelf_life_days")).intValue()).isEqualTo(5);
        assertThat(((Number) row.get("suggested_shelf_life_days")).intValue()).isEqualTo(3);
        assertThat(row.get("shelf_life_extended")).isEqualTo(Boolean.TRUE);
        assertThat(row.get("ack_at")).isEqualTo("2026-09-20 08:30:00");
    }
}
