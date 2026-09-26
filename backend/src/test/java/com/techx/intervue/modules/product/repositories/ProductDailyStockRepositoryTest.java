package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * {@code materialize} is native SQL (INSERT ... SELECT ... ON DUPLICATE KEY) — syntax errors only
 * show up at runtime, so this test runs against real MySQL instead of mocking the repository.
 */
@SpringBootTest
class ProductDailyStockRepositoryTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 9, 28);

    @Autowired private ProductDailyStockRepository repository;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private Long categoryId;
    private Long farmerUserId;
    private Long farmerId;
    private Long productId;

    @BeforeEach
    void setUp() {
        categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "PDS test " + tag,
                        "pds-" + tag);
        farmerUserId =
                insert(
                        "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?,"
                                + " 'x', 'farmer')",
                        "PDS farmer " + tag,
                        "pds-" + tag + "@test.vn");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, 'approved')",
                        farmerUserId,
                        "Stall PDS " + tag,
                        "Owner " + tag);
        productId =
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, 10000, 'kg', 0)",
                        farmerId,
                        categoryId,
                        "Product PDS " + tag);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM product_daily_stock WHERE product_id = ?", productId);
        jdbc.update("DELETE FROM weekly_stock_templates WHERE product_id = ?", productId);
        jdbc.update("DELETE FROM products WHERE id = ?", productId);
        jdbc.update("DELETE FROM farmer_profiles WHERE id = ?", farmerId);
        jdbc.update("DELETE FROM users WHERE id = ?", farmerUserId);
        jdbc.update("DELETE FROM categories WHERE id = ?", categoryId);
    }

    @Test
    void materializeSeedsFromTheMatchingWeekdayTemplate() {
        insert(
                "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                        + " default_quantity, default_price, is_active) VALUES (?, ?, 1, 40,"
                        + " 13000, TRUE)",
                farmerId,
                productId);

        repository.materialize(productId, MONDAY, 1);

        var row = repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow();
        assertThat(row.getQuantityAvailable()).isEqualTo(40);
        assertThat(row.getUnitPrice()).isEqualByComparingTo("13000");
    }

    @Test
    void materializeFallsBackToProductPriceWhenTemplatePriceIsNull() {
        insert(
                "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                        + " default_quantity, default_price, is_active) VALUES (?, ?, 1, 40, NULL,"
                        + " TRUE)",
                farmerId,
                productId);

        repository.materialize(productId, MONDAY, 1);

        var row = repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow();
        assertThat(row.getUnitPrice()).isEqualByComparingTo("10000");
    }

    @Test
    void materializeInsertsNothingWithoutAMatchingActiveTemplate() {
        insert(
                "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                        + " default_quantity, default_price, is_active) VALUES (?, ?, 1, 40, NULL,"
                        + " FALSE)",
                farmerId,
                productId);

        repository.materialize(productId, MONDAY, 1);

        assertThat(repository.findByProductIdAndStockDate(productId, MONDAY)).isEmpty();
    }

    @Test
    void materializeIsANoOpOnARowThatAlreadyExists() {
        insert(
                "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                        + " default_quantity, default_price, is_active) VALUES (?, ?, 1, 40, NULL,"
                        + " TRUE)",
                farmerId,
                productId);
        repository.materialize(productId, MONDAY, 1);
        var existing = repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow();
        existing.setQuantityAvailable(3); // simulate 37 already sold
        repository.save(existing);

        repository.materialize(productId, MONDAY, 1);

        assertThat(
                        repository
                                .findByProductIdAndStockDate(productId, MONDAY)
                                .orElseThrow()
                                .getQuantityAvailable())
                .isEqualTo(3);
    }

    private long insert(String sql, Object... args) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                con -> {
                    PreparedStatement ps =
                            con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    for (int i = 0; i < args.length; i++) {
                        ps.setObject(i + 1, args[i]);
                    }
                    return ps;
                },
                keys);
        return keys.getKey().longValue();
    }
}
