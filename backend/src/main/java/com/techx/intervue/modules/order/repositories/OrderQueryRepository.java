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
 * Đọc đơn cho cả hai phía (FR-033, 036, 065): danh sách của khách, danh sách của Farmer, chi tiết
 * một đơn, dòng hàng và lịch sử trạng thái của nó. Join {@code farmer_profiles} (tên sạp) và {@code
 * markets} (tên chợ) — module order không lặp lại logic hiển thị của hai module đó.
 *
 * <p>{@code status} luôn là giá trị đã qua {@link OrderStatus#valueOf} ở service (whitelist), và
 * {@code sort} không tồn tại ở đây — thứ tự cố định theo nghiệp vụ của từng danh sách. Không chỗ
 * nào nối chuỗi input người dùng vào SQL (R-04).
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

    /** {@code GET /orders} — mua của chính khách (buyer), mới nhất trước. */
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

    /** {@code GET /farmer/orders} — đơn đặt tại sạp, theo giờ nhận hàng. */
    public static final String FARMER_ORDERS_SQL =
            LIST_COLUMNS
                    + FARMER_ORDERS_FROM
                    + "ORDER BY o.pickup_date, o.pickup_start, o.id\nLIMIT :limit OFFSET :offset";

    private static final String FARMER_ORDERS_COUNT_SQL = "SELECT COUNT(*) " + FARMER_ORDERS_FROM;

    /**
     * Một đơn, kèm liên hệ khách (chỉ dùng khi người gọi là Farmer, C5) và {@code farmer_user_id}
     * để service tự quyết ai được xem (R-06, Review focus #3) — câu này không lọc theo người gọi.
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
     * {@code cutoff_at} là DATETIME (giờ local Việt Nam, không có múi giờ) — đọc bằng {@code
     * getObject(..., LocalDateTime.class)} để tránh driver quy đổi theo {@code serverTimezone}, y
     * hệt lý do {@code Order.cutoffAt} cần {@code @JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)} (C5-15).
     */
    private String formatCutoff(LocalDateTime cutoffAt) {
        return cutoffAt.atZone(clock.getZone()).toInstant().toString();
    }

    /**
     * Cột TIMESTAMP ({@code created_at}, {@code changed_at}) đã là một khoảnh khắc UTC thật —
     * {@code toInstant()} là đủ, không cộng/trừ múi giờ thêm lần nào nữa (C5-15).
     */
    private static String readInstant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column).toInstant().toString();
    }

    /**
     * Dòng chi tiết đầy đủ của một đơn, dùng để vừa dựng {@link OrderListItemResource} (qua {@code
     * summary}) vừa cho service tự quyết quyền xem — không câu SQL nào ở đây lọc theo người gọi.
     */
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
