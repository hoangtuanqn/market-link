package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
class ProductDailyStockRepositoryTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 9, 28);

    @Autowired private ProductDailyStockRepository repository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactions;

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
        existing.setQuantityAvailable(3);
        repository.save(existing);

        repository.materialize(productId, MONDAY, 1);

        assertThat(
                        repository
                                .findByProductIdAndStockDate(productId, MONDAY)
                                .orElseThrow()
                                .getQuantityAvailable())
                .isEqualTo(3);
    }

    @Test
    void aDealDayIsStoredWithItsFourColumns() {
        repository.saveAndFlush(dealDay(20));

        ProductDailyStock saved =
                repository.findByProductIdAndStockDate(productId, MONDAY).orElseThrow();
        assertThat(saved.getListPrice()).isEqualByComparingTo("0.60");
        assertThat(saved.getUnitPrice()).isEqualByComparingTo("0.48");
        assertThat(saved.getDiscountPercent()).isEqualTo(20);
        assertThat(saved.getPackedOn()).isEqualTo(MONDAY.minusDays(4));
        assertThat(saved.getBestBefore()).isEqualTo(MONDAY.plusDays(2));
    }

    @Test
    void theDatabaseRefusesAHalfSetDeal() {
        ProductDailyStock row = plainDay();
        row.setListPrice(new BigDecimal("0.60"));

        assertThatThrownBy(() -> repository.saveAndFlush(row))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theDatabaseRefusesADiscountAbove70() {
        assertThatThrownBy(() -> repository.saveAndFlush(dealDay(80)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void lockFromReturnsTheDaysFromThatDateOnNearestFirst() {
        for (LocalDate date : List.of(MONDAY.plusDays(7), MONDAY, MONDAY.minusDays(1))) {
            ProductDailyStock row = plainDay();
            row.setStockDate(date);
            repository.saveAndFlush(row);
        }

        List<LocalDate> dates =
                new TransactionTemplate(transactions)
                        .execute(
                                status ->
                                        repository.lockFrom(productId, MONDAY).stream()
                                                .map(ProductDailyStock::getStockDate)
                                                .toList());

        assertThat(dates).containsExactly(MONDAY, MONDAY.plusDays(7));
    }

    private ProductDailyStock plainDay() {
        ProductDailyStock row = new ProductDailyStock();
        row.setProductId(productId);
        row.setStockDate(MONDAY);
        row.setQuantityAvailable(12);
        row.setUnitPrice(new BigDecimal("0.60"));
        return row;
    }

    private ProductDailyStock dealDay(int percent) {
        ProductDailyStock row = plainDay();
        row.startDeal(new BigDecimal("0.48"), percent, MONDAY.minusDays(4), MONDAY.plusDays(2));
        return row;
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
