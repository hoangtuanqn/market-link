package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.resources.FarmerProductResource;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-031, FR-063, D-02 on real MySQL: the Farmer's product list shows, for the nearest date a
 * customer can still order, what is left and how many units active orders hold for that date.
 * {@code products.stock_quantity} stays the Farmer's own reference number. Rolled back after each
 * test.
 */
@SpringBootTest
@Transactional
class FarmerProductNextDateTest {

    /** The only date with pickup slots, so it is the nearest orderable one. */
    private static final LocalDate PICKUP =
            LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(3);

    @Autowired private ProductService service;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private long farmerUserId;
    private long farmerId;
    private long marketId;
    private long customerId;
    private long productId;

    @BeforeEach
    void setUp() {
        long categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Next date " + tag,
                        "next-date-" + tag);
        marketId =
                insert(
                        "INSERT INTO markets (market_name, address, latitude, longitude,"
                                + " opening_time, closing_time)"
                                + " VALUES (?, 'Test', 10.8, 106.7, '05:00:00', '18:00:00')",
                        "Next date market " + tag);
        farmerUserId = insertUser("farmer");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, 'Seller', 'approved')",
                        farmerUserId,
                        "Next date stall " + tag);
        long farmerMarketId =
                insert(
                        "INSERT INTO farmer_markets (farmer_id, market_id) VALUES (?, ?)",
                        farmerId,
                        marketId);
        for (int day = 0; day < 7; day++) {
            insert(
                    "INSERT INTO market_operating_days (market_id, day_of_week) VALUES (?, ?)",
                    marketId,
                    day);
            insert(
                    "INSERT INTO farmer_operating_days (farmer_market_id, day_of_week,"
                            + " pickup_start_time, pickup_end_time) VALUES (?, ?, '07:00',"
                            + " '10:00')",
                    farmerMarketId,
                    day);
        }
        for (LocalDate date : new LocalDate[] {PICKUP, PICKUP.plusDays(1)}) {
            insert(
                    "INSERT INTO pickup_slots (farmer_market_id, slot_date, start_time, end_time,"
                            + " max_orders) VALUES (?, ?, '07:00', '08:00', 5)",
                    farmerMarketId,
                    java.sql.Date.valueOf(date));
        }
        customerId = insertUser("customer");
        productId =
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, 2, 'kg', 99)",
                        farmerId,
                        categoryId,
                        "Next date product " + tag);
        for (int day = 0; day < 7; day++) {
            insert(
                    "INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week,"
                            + " default_quantity) VALUES (?, ?, ?, 20)",
                    farmerId,
                    productId,
                    day);
        }
        // 20 at the start of the day, 6 held by active orders, 9 more by orders no longer active
        // whose stock was never given back in this fixture: 5 left
        insert(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, 5, 2)",
                productId,
                java.sql.Date.valueOf(PICKUP));
    }

    @Test
    void theListShowsTheNearestOrderableDateWithWhatIsLeftAndWhatActiveOrdersHold() {
        order(PICKUP, "placed", 2);
        order(PICKUP, "accepted", 3);
        order(PICKUP, "ready", 1);
        order(PICKUP, "cancelled", 4);
        order(PICKUP, "declined", 7);
        order(PICKUP, "completed", 8);
        order(PICKUP.plusDays(1), "placed", 9);

        FarmerProductResource row = service.mine(farmerUserId, null, 1, 50).items().getFirst();

        assertThat(row.nextDate()).isEqualTo(PICKUP.toString());
        assertThat(row.nextDateAvailable()).isEqualTo(5);
        assertThat(row.nextDateReserved()).isEqualTo(6);
        assertThat(row.item().stockQuantity()).isEqualTo(99);
    }

    @Test
    void noOrderableDateLeavesTheOverlayEmpty() {
        jdbc.update("DELETE FROM weekly_stock_templates WHERE product_id = ?", productId);

        FarmerProductResource row = service.mine(farmerUserId, null, 1, 50).items().getFirst();

        assertThat(row.nextDate()).isNull();
        assertThat(row.nextDateAvailable()).isNull();
        assertThat(row.nextDateReserved()).isNull();
    }

    private void order(LocalDate pickup, String status, int quantity) {
        long orderId =
                insert(
                        "INSERT INTO orders (order_code, customer_id, farmer_id, market_id,"
                                + " pickup_date, pickup_start, pickup_end, cutoff_at, total_amount,"
                                + " status) VALUES (?, ?, ?, ?, ?, '07:00', '08:00', ?, 0, ?)",
                        "ND" + UUID.randomUUID().toString().substring(0, 10),
                        customerId,
                        farmerId,
                        marketId,
                        java.sql.Date.valueOf(pickup),
                        java.sql.Timestamp.valueOf(pickup.minusDays(1).atTime(19, 0)),
                        status);
        insert(
                "INSERT INTO order_items (order_id, product_id, product_name, unit_price, unit,"
                        + " quantity, subtotal) VALUES (?, ?, 'x', 2, 'kg', ?, 0)",
                orderId,
                productId,
                quantity);
    }

    private long insertUser(String role) {
        String email = role + "-" + tag + "-" + UUID.randomUUID().toString().substring(0, 6);
        return insert(
                "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, 'x', ?)",
                "Next date " + email,
                email + "@next-date.test",
                role);
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
