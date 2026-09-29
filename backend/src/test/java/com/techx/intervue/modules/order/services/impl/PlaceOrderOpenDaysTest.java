package com.techx.intervue.modules.order.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.order.exceptions.SlotNotAvailableException;
import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.ModifyOrderRequest;
import com.techx.intervue.modules.order.requests.OrderGroupInput;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import jakarta.persistence.EntityManager;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PlaceOrderOpenDaysTest {

    private static final LocalDate PICKUP =
            LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(3);

    private static final int PICKUP_DOW = PICKUP.getDayOfWeek().getValue() % 7;

    @Autowired private OrderService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private long marketId;
    private long farmerId;
    private long farmerMarketId;
    private long customerId;
    private long productId;
    private long slotId;

    @BeforeEach
    void setUp() {
        long categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Open days " + tag,
                        "open-days-" + tag);
        marketId =
                insert(
                        "INSERT INTO markets (market_name, address, latitude, longitude,"
                                + " opening_time, closing_time)"
                                + " VALUES (?, 'Test', 10.8, 106.7, '05:00:00', '18:00:00')",
                        "Open days market " + tag);
        long farmerUserId = insertUser("farmer");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, 'Seller', 'approved')",
                        farmerUserId,
                        "Open days stall " + tag);
        farmerMarketId =
                insert(
                        "INSERT INTO farmer_markets (farmer_id, market_id) VALUES (?, ?)",
                        farmerId,
                        marketId);
        insert(
                "INSERT INTO market_operating_days (market_id, day_of_week) VALUES (?, ?)",
                marketId,
                PICKUP_DOW);
        insert(
                "INSERT INTO farmer_operating_days (farmer_market_id, day_of_week,"
                        + " pickup_start_time, pickup_end_time) VALUES (?, ?, '07:00', '10:00')",
                farmerMarketId,
                PICKUP_DOW);
        customerId = insertUser("customer");
        productId =
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, 2, 'kg', 0)",
                        farmerId,
                        categoryId,
                        "Open days product " + tag);
        insert(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, 10, 2)",
                productId,
                java.sql.Date.valueOf(PICKUP));
        slotId =
                insert(
                        "INSERT INTO pickup_slots (farmer_market_id, slot_date, start_time,"
                                + " end_time, max_orders) VALUES (?, ?, '07:00', '08:00', 5)",
                        farmerMarketId,
                        java.sql.Date.valueOf(PICKUP));
    }

    @Test
    void aSlotOnAnOpenDayCanBeBooked() {
        assertThat(service.place(customerId, request())).hasSize(1);
    }

    @Test
    void aSlotOnAWeekdayTheMarketIsNoLongerHeldCannotBeBooked() {
        jdbc.update("DELETE FROM market_operating_days WHERE market_id = ?", marketId);

        assertThatThrownBy(() -> service.place(customerId, request()))
                .isInstanceOf(SlotNotAvailableException.class);
        assertThat(bookedCount()).isZero();
    }

    @Test
    void aSlotOnAWeekdayTheStallNoLongerAttendsCannotBeBooked() {
        jdbc.update("DELETE FROM farmer_operating_days WHERE farmer_market_id = ?", farmerMarketId);

        assertThatThrownBy(() -> service.place(customerId, request()))
                .isInstanceOf(SlotNotAvailableException.class);
        assertThat(bookedCount()).isZero();
    }

    @Test
    void anOrderAlreadyPlacedCanStillBeEditedAndCancelledWhenTheDayIsDropped() {
        long orderId = service.place(customerId, request()).get(0).orderId();
        entityManager.flush();
        jdbc.update("DELETE FROM market_operating_days WHERE market_id = ?", marketId);
        jdbc.update("DELETE FROM farmer_operating_days WHERE farmer_market_id = ?", farmerMarketId);

        assertThat(
                        service.modifyItems(
                                        customerId,
                                        orderId,
                                        new ModifyOrderRequest(List.of(new CartLine(productId, 2))))
                                .summary()
                                .status())
                .isEqualTo("placed");
        assertThat(service.cancel(customerId, orderId).summary().status()).isEqualTo("cancelled");
        assertThat(bookedCount()).isZero();
    }

    private PlaceOrderRequest request() {
        return new PlaceOrderRequest(
                List.of(
                        new OrderGroupInput(
                                farmerId,
                                marketId,
                                slotId,
                                PICKUP,
                                List.of(new CartLine(productId, 1)),
                                null)));
    }

    private int bookedCount() {
        return jdbc.queryForObject(
                "SELECT booked_count FROM pickup_slots WHERE id = ?", Integer.class, slotId);
    }

    private long insertUser(String role) {
        String email = role + "-" + tag + "-" + UUID.randomUUID().toString().substring(0, 6);
        return insert(
                "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, 'x', ?)",
                "Open days " + email,
                email + "@open-days.test",
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
