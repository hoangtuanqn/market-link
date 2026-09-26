package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.order.exceptions.OutOfStockException;
import com.techx.intervue.modules.order.exceptions.SlotFullException;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * Review focus #1 and #2. Two customers race for the last batch and the last slot. Exactly one
 * wins; the other gets 409. No negative stock, no booked_count over max_orders.
 *
 * <p>Runs on real MySQL (no @Transactional: each thread must really commit for the lock to mean
 * anything). The dev DB is shared with the demo seed, so every test row is given a distinctive name
 * and deleted in {@code @AfterEach} (C5-7).
 */
@SpringBootTest
class PlaceOrderConcurrencyTest {

    /** A pickup day 3 days from today: further out than any default cutoff (12 hours). */
    private static final LocalDate PICKUP =
            LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(3);

    @Autowired private OrderService service;

    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private final AtomicInteger turn = new AtomicInteger();
    private final List<Long> customers = new ArrayList<>();
    private final List<Long> productIds = new ArrayList<>();
    private final List<Long> slotIds = new ArrayList<>();
    private Long categoryId;
    private Long marketId;
    private Long farmerUserId;
    private Long farmerId;
    private Long farmerMarketId;

    @Test
    void onlyOneOfTwoSimultaneousOrdersGetsTheLastUnit() throws Exception {
        long productId = givenProductWithStock(1);
        long slotId = givenSlotWithCapacity(5);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> attempt =
                () -> {
                    try {
                        service.place(someCustomer(), requestFor(productId, 1, slotId));
                        return true;
                    } catch (OutOfStockException e) {
                        return false;
                    }
                };

        List<Boolean> results =
                pool.invokeAll(List.of(attempt, attempt)).stream()
                        .map(
                                f -> {
                                    try {
                                        return f.get();
                                    } catch (Exception e) {
                                        throw new IllegalStateException(e);
                                    }
                                })
                        .toList();
        pool.shutdown();

        assertThat(results).containsExactlyInAnyOrder(true, false);
        assertThat(stockOf(productId)).isZero();
    }

    /** Two different pickup dates of the same product don't share a reserve. */
    @Test
    void orderingOneDateDoesNotTouchAnotherDateOfTheSameProduct() {
        long productId = givenProductWithStock(5);
        LocalDate otherDate = PICKUP.plusDays(1);
        insert(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, 7, 20000)",
                productId,
                java.sql.Date.valueOf(otherDate));
        long slotId = givenSlotWithCapacity(5);

        service.place(someCustomer(), requestFor(productId, 5, slotId));

        assertThat(
                        jdbc.queryForObject(
                                "SELECT quantity_available FROM product_daily_stock WHERE"
                                        + " product_id = ? AND stock_date = ?",
                                Integer.class,
                                productId,
                                java.sql.Date.valueOf(otherDate)))
                .isEqualTo(7);
    }

    @Test
    void bookedCountNeverExceedsMaxOrders() throws Exception {
        long productId = givenProductWithStock(100);
        long slotId = givenSlotWithCapacity(1);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> attempt =
                () -> {
                    try {
                        service.place(someCustomer(), requestFor(productId, 1, slotId));
                        return true;
                    } catch (SlotFullException e) {
                        return false;
                    }
                };

        List<Boolean> results =
                pool.invokeAll(List.of(attempt, attempt)).stream()
                        .map(
                                f -> {
                                    try {
                                        return f.get();
                                    } catch (Exception e) {
                                        throw new IllegalStateException(e);
                                    }
                                })
                        .toList();
        pool.shutdown();

        assertThat(results).containsExactlyInAnyOrder(true, false);
        assertThat(bookedCountOf(slotId)).isEqualTo(1);
    }

    /**
     * Not a race, but also only checkable on real MySQL: DATETIME stores Vietnam time. MySQL runs
     * on UTC and the JDBC URL has serverTimezone=UTC, so a LocalDateTime sent as a Timestamp is
     * shifted back 7 hours (found by manual testing). Read the raw column with DATE_FORMAT so JDBC
     * does not shift the time zone.
     */
    @Test
    void cutoffIsStoredInVietnamLocalTime() {
        long productId = givenProductWithStock(5);
        long slotId = givenSlotWithCapacity(5);

        service.place(someCustomer(), requestFor(productId, 1, slotId));

        // a 07:00 slot, the default 12-hour cutoff → 19:00 the day before, exactly what the Farmer
        // and customer see
        assertThat(
                        jdbc.queryForObject(
                                "SELECT DATE_FORMAT(cutoff_at, '%Y-%m-%d %H:%i') FROM orders"
                                        + " WHERE farmer_id = ?",
                                String.class, farmerId))
                .isEqualTo(PICKUP.minusDays(1) + " 19:00");
    }

    // ---------- minimal data, inserted with JdbcTemplate ----------

    @BeforeEach
    void setUp() {
        categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Tranh chấp " + tag,
                        "race-" + tag);
        marketId =
                insert(
                        "INSERT INTO markets (market_name, address, latitude, longitude,"
                                + " opening_time, closing_time)"
                                + " VALUES (?, 'Test', 10.8, 106.7, '05:00:00', '18:00:00')",
                        "Chợ tranh chấp " + tag);
        farmerUserId = insertUser("farmer");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, 'approved')",
                        farmerUserId,
                        "Stall tranh chấp " + tag,
                        "Người bán " + tag);
        farmerMarketId =
                insert(
                        "INSERT INTO farmer_markets (farmer_id, market_id) VALUES (?, ?)",
                        farmerId,
                        marketId);
        customers.add(insertUser("customer"));
        customers.add(insertUser("customer"));
    }

    /**
     * C5-7: deleted in child → parent order — order_items and order_status_history follow orders.
     */
    @AfterEach
    void tearDown() {
        if (farmerId != null) {
            jdbc.update("DELETE FROM orders WHERE farmer_id = ?", farmerId);
        }
        productIds.forEach(
                id -> jdbc.update("DELETE FROM product_daily_stock WHERE product_id = ?", id));
        productIds.forEach(id -> jdbc.update("DELETE FROM products WHERE id = ?", id));
        slotIds.forEach(id -> jdbc.update("DELETE FROM pickup_slots WHERE id = ?", id));
        deleteById("farmer_markets", farmerMarketId);
        deleteById("farmer_profiles", farmerId);
        deleteById("markets", marketId);
        deleteById("categories", categoryId);
        customers.forEach(id -> deleteById("users", id));
        deleteById("users", farmerUserId);
    }

    private void deleteById(String table, Long id) {
        if (id != null) {
            jdbc.update("DELETE FROM " + table + " WHERE id = ?", id);
        }
    }

    private long insertUser(String role) {
        String email = role + "-" + tag + "-" + UUID.randomUUID().toString().substring(0, 6);
        return insert(
                "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, 'x', ?)",
                "Race " + email,
                email + "@concurrency.test",
                role);
    }

    private long givenProductWithStock(int stock) {
        long id =
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, 20000, 'kg', 0)",
                        farmerId,
                        categoryId,
                        "Lô cuối " + tag + " #" + productIds.size());
        productIds.add(id);
        insert(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, ?, 20000)",
                id,
                java.sql.Date.valueOf(PICKUP),
                stock);
        return id;
    }

    private long givenSlotWithCapacity(int maxOrders) {
        long id =
                insert(
                        "INSERT INTO pickup_slots (farmer_market_id, slot_date, start_time,"
                                + " end_time, max_orders) VALUES (?, ?, '07:00:00', '08:00:00', ?)",
                        farmerMarketId,
                        java.sql.Date.valueOf(PICKUP),
                        maxOrders);
        slotIds.add(id);
        return id;
    }

    /** Two different customers race for the same thing in turn. */
    private long someCustomer() {
        return customers.get(turn.getAndIncrement() % customers.size());
    }

    private PlaceOrderRequest requestFor(long productId, int quantity, long slotId) {
        return new PlaceOrderRequest(
                List.of(
                        new OrderGroupInput(
                                farmerId,
                                marketId,
                                slotId,
                                PICKUP,
                                List.of(new CartLine(productId, quantity)),
                                null)));
    }

    private int stockOf(long productId) {
        return jdbc.queryForObject(
                "SELECT quantity_available FROM product_daily_stock WHERE product_id = ? AND"
                        + " stock_date = ?",
                Integer.class,
                productId,
                java.sql.Date.valueOf(PICKUP));
    }

    private int bookedCountOf(long slotId) {
        return jdbc.queryForObject(
                "SELECT booked_count FROM pickup_slots WHERE id = ?", Integer.class, slotId);
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
