package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.resources.OrderHistoryResource;
import com.techx.intervue.modules.order.resources.OrderItemResource;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads orders for both sides (FR-033, 036, 065): the customer's list, the Farmer's list, one
 * order's detail, its item lines and its status history. Joins {@code farmer_profiles} (stall name)
 * and {@code markets} (market name) — the order module does not repeat those two modules' display
 * logic.
 *
 * <p>{@code status} is always a value that went through {@link OrderStatus#valueOf} in the service
 * (whitelist), and there is no {@code sort} here — each list has a fixed, business-defined order.
 * Nowhere is user input concatenated into SQL (R-04).
 */
@Repository
@RequiredArgsConstructor
public class OrderQueryRepository {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private static final String LIST_COLUMNS =
            """
            SELECT o.id, o.order_code, o.status, o.farmer_id, f.stall_name, o.market_id, m.market_name,
                   o.pickup_date, o.pickup_start, o.pickup_end, o.cutoff_at, o.total_amount, o.created_at,
                   (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
            """;

    private static final String MY_ORDERS_FROM =
            """
            FROM orders o
            JOIN farmer_profiles f ON f.id = o.farmer_id
            JOIN markets m ON m.id = o.market_id
            WHERE o.customer_id = :customerId
              AND (:status IS NULL OR o.status = :status)
            """;

    /** {@code GET /orders} — the customer's own purchases (buyer), newest first. */
    public static final String READY_PAST_PICKUP_SQL =
            """
            SELECT o.id
            FROM orders o
            WHERE o.status = 'ready'
              AND TIMESTAMP(o.pickup_date, o.pickup_end) < :threshold
            ORDER BY o.id
            LIMIT :limit
            """;

    private static final DateTimeFormatter LOCAL_DATE_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static final String MY_ORDERS_SQL =
            LIST_COLUMNS
                    + MY_ORDERS_FROM
                    + "ORDER BY o.created_at DESC, o.id DESC\nLIMIT :limit OFFSET :offset";

    private static final String MY_ORDERS_COUNT_SQL = "SELECT COUNT(*) " + MY_ORDERS_FROM;

    private static final String FARMER_ORDERS_FROM =
            """
            FROM orders o
            JOIN farmer_profiles f ON f.id = o.farmer_id
            JOIN markets m ON m.id = o.market_id
            WHERE o.farmer_id = :farmerId
              AND (:status IS NULL OR o.status = :status)
              AND (:date IS NULL OR o.pickup_date = :date)
            """;

    /** {@code GET /farmer/orders} — orders placed at the stall, by pickup time. */
    public static final String FARMER_ORDERS_SQL =
            LIST_COLUMNS
                    + FARMER_ORDERS_FROM
                    + "ORDER BY o.pickup_date, o.pickup_start, o.id\nLIMIT :limit OFFSET :offset";

    private static final String FARMER_ORDERS_COUNT_SQL = "SELECT COUNT(*) " + FARMER_ORDERS_FROM;

    /**
     * One order, with the customer's contact (only used when the caller is the Farmer, C5) and
     * {@code farmer_user_id} so the service decides who may see it (R-06, Review focus #3) — this
     * query does not filter by the caller.
     */
    public static final String DETAIL_SQL =
            """
            SELECT o.id, o.order_code, o.status, o.customer_id, cu.full_name AS customer_full_name,
                   cu.phone AS customer_phone, cu.email AS customer_email,
                   o.farmer_id, f.stall_name, f.user_id AS farmer_user_id,
                   o.market_id, m.market_name,
                   o.pickup_date, o.pickup_start, o.pickup_end, o.cutoff_at, o.total_amount,
                   (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                   o.created_at, o.customer_note, o.farmer_note
            FROM orders o
            JOIN users cu ON cu.id = o.customer_id
            JOIN farmer_profiles f ON f.id = o.farmer_id
            JOIN markets m ON m.id = o.market_id
            WHERE o.id = :id
            """;

    /** Task 8.3 (FR-050): does the order already carry a review — any target, any status. */
    public static final String REVIEWED_SQL =
            "SELECT EXISTS(SELECT 1 FROM reviews r WHERE r.order_id = :orderId)";

    public static final String ITEMS_SQL =
            """
            SELECT product_id, product_name, unit, unit_price, quantity, subtotal
            FROM order_items
            WHERE order_id = :orderId
            ORDER BY id
            """;

    public static final String HISTORY_SQL =
            """
            SELECT h.from_status, h.to_status, h.changed_at, h.note, h.changed_by,
                   u.full_name AS changed_by_name, u.role AS changed_by_role
            FROM order_status_history h
            LEFT JOIN users u ON u.id = h.changed_by
            WHERE h.order_id = :orderId
            ORDER BY h.changed_at, h.id
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;

    public PageResource<OrderListItemResource> myOrders(
            long customerId, String status, int offset, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("customerId", customerId)
                        .addValue("status", status);
        Long total = jdbc.queryForObject(MY_ORDERS_COUNT_SQL, params, Long.class);
        params.addValue("limit", limit).addValue("offset", offset);
        List<OrderListItemResource> items =
                jdbc.query(MY_ORDERS_SQL, params, (rs, i) -> listItem(rs));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    public PageResource<OrderListItemResource> farmerOrders(
            long farmerId, String status, LocalDate date, int offset, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("status", status)
                        .addValue("date", date);
        Long total = jdbc.queryForObject(FARMER_ORDERS_COUNT_SQL, params, Long.class);
        params.addValue("limit", limit).addValue("offset", offset);
        List<OrderListItemResource> items =
                jdbc.query(FARMER_ORDERS_SQL, params, (rs, i) -> listItem(rs));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    public Optional<OrderDetailRow> findDetail(long orderId) {
        List<OrderDetailRow> rows =
                jdbc.query(
                        DETAIL_SQL,
                        new MapSqlParameterSource("id", orderId),
                        (rs, i) -> detailRow(rs));
        return rows.stream().findFirst();
    }

    public boolean reviewed(long orderId) {
        Boolean found =
                jdbc.queryForObject(
                        REVIEWED_SQL, new MapSqlParameterSource("orderId", orderId), Boolean.class);
        return Boolean.TRUE.equals(found);
    }

    public List<OrderItemResource> items(long orderId) {
        return jdbc.query(
                ITEMS_SQL,
                new MapSqlParameterSource("orderId", orderId),
                (rs, i) ->
                        new OrderItemResource(
                                rs.getLong("product_id"),
                                rs.getString("product_name"),
                                rs.getString("unit"),
                                rs.getBigDecimal("unit_price"),
                                rs.getInt("quantity"),
                                rs.getBigDecimal("subtotal")));
    }

    public List<OrderHistoryResource> history(long orderId) {
        return jdbc.query(
                HISTORY_SQL,
                new MapSqlParameterSource("orderId", orderId),
                (rs, i) ->
                        new OrderHistoryResource(
                                rs.getString("from_status"),
                                rs.getString("to_status"),
                                readInstant(rs, "changed_at"),
                                rs.getString("note"),
                                rs.getString("changed_by_name"),
                                rs.getString("changed_by_role")));
    }

    private OrderListItemResource listItem(ResultSet rs) throws SQLException {
        return new OrderListItemResource(
                rs.getLong("id"),
                rs.getString("order_code"),
                rs.getString("status"),
                rs.getLong("farmer_id"),
                rs.getString("stall_name"),
                rs.getLong("market_id"),
                rs.getString("market_name"),
                rs.getObject("pickup_date", LocalDate.class).toString(),
                rs.getTime("pickup_start").toLocalTime().format(HH_MM),
                rs.getTime("pickup_end").toLocalTime().format(HH_MM),
                formatCutoff(rs.getObject("cutoff_at", LocalDateTime.class)),
                rs.getBigDecimal("total_amount"),
                rs.getInt("item_count"),
                readInstant(rs, "created_at"));
    }

    private OrderDetailRow detailRow(ResultSet rs) throws SQLException {
        return new OrderDetailRow(
                listItem(rs),
                OrderStatus.valueOf(rs.getString("status").toUpperCase(Locale.ROOT)),
                rs.getObject("cutoff_at", LocalDateTime.class),
                rs.getLong("customer_id"),
                rs.getString("customer_full_name"),
                rs.getString("customer_phone"),
                rs.getString("customer_email"),
                rs.getLong("farmer_user_id"),
                rs.getString("customer_note"),
                rs.getString("farmer_note"));
    }

    /**
     * {@code cutoff_at} is a DATETIME (Vietnam local time, no time zone) — read with {@code
     * getObject(..., LocalDateTime.class)} so the driver does not convert it by {@code
     * serverTimezone}, for exactly the reason {@code Order.cutoffAt} needs
     * {@code @JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)} (C5-15).
     */
    private String formatCutoff(LocalDateTime cutoffAt) {
        return cutoffAt.atZone(clock.getZone()).toInstant().toString();
    }

    /**
     * TIMESTAMP columns ({@code created_at}, {@code changed_at}) are already a real UTC instant —
     * {@code toInstant()} is enough, never add/subtract a time zone again (C5-15).
     */
    private static String readInstant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column).toInstant().toString();
    }

    /**
     * The full detail row of one order, used both to build the {@link OrderListItemResource} (via
     * {@code summary}) and to let the service decide who may see it — no SQL here filters by the
     * caller.
     */
    /**
     * FR-039 / D-03: ready orders whose pickup ended before {@code threshold} (now − 24 h, Vietnam
     * local time — pickup_date and pickup_end are local, like cutoff_at). Oldest id first, one
     * batch at a time.
     */
    public List<Long> readyPastPickup(LocalDateTime threshold, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        // bound as text so the driver's time zone setting cannot shift it
                        .addValue("threshold", threshold.format(LOCAL_DATE_TIME))
                        .addValue("limit", limit);
        return jdbc.queryForList(READY_PAST_PICKUP_SQL, params, Long.class);
    }

    public record OrderDetailRow(
            OrderListItemResource summary,
            OrderStatus status,
            LocalDateTime cutoffAt,
            long customerId,
            String customerFullName,
            String customerPhone,
            String customerEmail,
            long farmerUserId,
            String customerNote,
            String farmerNote) {}
}
