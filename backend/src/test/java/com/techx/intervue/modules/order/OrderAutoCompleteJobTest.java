package com.techx.intervue.modules.order;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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
 * FR-039, D-03 — runs the real sweep against MySQL: the "24 hours after pickup" window and the
 * status filter live in SQL, so they are only proven on the real engine. Not @Transactional — the
 * sweep commits one transaction per order — so every row it inserts is removed in @AfterEach.
 */
@SpringBootTest
class OrderAutoCompleteJobTest {

    @Autowired private OrderAutoCompleteJob job;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Clock clock;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private Long marketId;
    private Long farmerUserId;
    private Long farmerId;
    private Long customerId;

    @BeforeEach
    void setUp() {
        marketId =
                insert(
                        "INSERT INTO markets (market_name, address, latitude, longitude,"
                                + " opening_time, closing_time)"
                                + " VALUES (?, 'Test', 10.8, 106.7, '05:00:00', '18:00:00')",
                        "Auto-complete market " + tag);
        farmerUserId = insertUser("farmer");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, 'approved')",
                        farmerUserId,
                        "Auto-complete stall " + tag,
                        "Seller " + tag);
        customerId = insertUser("customer");
    }

    @AfterEach
    void tearDown() {
        if (farmerId != null) {
            // order_items and order_status_history follow orders (ON DELETE CASCADE)
            jdbc.update("DELETE FROM orders WHERE farmer_id = ?", farmerId);
            jdbc.update("DELETE FROM farmer_profiles WHERE id = ?", farmerId);
        }
        deleteById("markets", marketId);
        deleteById("users", customerId);
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
                "Auto " + email,
                email + "@autocomplete.test",
                role);
    }

    /** Pickup 07:00–08:00 on {@code pickupDate}. */
    private long order(String status, LocalDate pickupDate) {
        return insert(
                "INSERT INTO orders (order_code, customer_id, farmer_id, market_id, pickup_date,"
                        + " pickup_start, pickup_end, cutoff_at, total_amount, status)"
                        + " VALUES (?, ?, ?, ?, ?, '07:00:00', '08:00:00', ?, 10000, ?)",
                "AC-" + UUID.randomUUID().toString().substring(0, 12),
                customerId,
                farmerId,
                marketId,
                pickupDate,
                pickupDate.minusDays(1).atTime(19, 0),
                status);
    }

    private String statusOf(long orderId) {
        return jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, orderId);
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    @Test
    void completesReadyOrdersPastPickupDatePlusTwentyFourHours() {
        long due = order("ready", today().minusDays(2));

        job.sweep();

        assertThat(statusOf(due)).isEqualTo("completed");
    }

    @Test
    void leavesReadyOrdersInsideTheWindowAlone() {
        long notYet = order("ready", today());

        job.sweep();

        assertThat(statusOf(notYet)).isEqualTo("ready");
    }

    @Test
    void ignoresOrdersThatAreNotReady() {
        long accepted = order("accepted", today().minusDays(3));
        long placed = order("placed", today().minusDays(3));

        job.sweep();

        assertThat(statusOf(accepted)).isEqualTo("accepted");
        assertThat(statusOf(placed)).isEqualTo("placed");
    }

    @Test
    void writesOneHistoryRowPerOrderWithNullActor() {
        long due = order("ready", today().minusDays(2));

        job.sweep();

        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "SELECT from_status, to_status, changed_by, note"
                                + " FROM order_status_history WHERE order_id = ?",
                        due);
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).get("from_status")).isEqualTo("ready");
        assertThat(rows.get(0).get("to_status")).isEqualTo("completed");
        assertThat(rows.get(0).get("changed_by")).isNull();
        assertThat(rows.get(0).get("note")).isEqualTo("Auto-completed after pickup.");
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
