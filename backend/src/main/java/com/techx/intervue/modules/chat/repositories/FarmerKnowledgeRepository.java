package com.techx.intervue.modules.chat.repositories;

import com.techx.intervue.modules.chat.resources.FarmerRows.BestSellerRow;
import com.techx.intervue.modules.chat.resources.FarmerRows.BriefingRow;
import com.techx.intervue.modules.chat.resources.FarmerRows.FarmerReviewRow;
import com.techx.intervue.modules.chat.resources.FarmerRows.OrderItemRow;
import com.techx.intervue.modules.chat.resources.FarmerRows.OrderRow;
import com.techx.intervue.modules.chat.resources.FarmerRows.ProductStockRow;
import com.techx.intervue.modules.chat.resources.FarmerRows.SalesRow;
import com.techx.intervue.modules.chat.resources.FarmerRows.ScheduleDayRow;
import java.math.BigDecimal;
import java.sql.Types;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * FR-093: the fixed SQL the Farmer assistant may run. Same rules as {@link ChatKnowledgeRepository}
 * (R-04: read-only, every user value is a parameter, nothing is concatenated) plus one more that
 * matters more here — <b>every query is scoped by {@code :farmerId}</b>, and that value comes from
 * the signed-in account, never from a tool argument.
 */
@Repository
@RequiredArgsConstructor
public class FarmerKnowledgeRepository {

    private static final int ROW_LIMIT = 20;

    private static final String FARMER_ID_OF_USER =
            "SELECT id FROM farmer_profiles WHERE user_id = :userId";

    private static final String STALL_NAME =
            "SELECT stall_name FROM farmer_profiles WHERE id = :farmerId";

    /** What is in one order of this stall; another stall's order id finds nothing. */
    private static final String MY_ORDER_ITEMS =
            """
            SELECT i.product_name, i.quantity, i.unit, i.subtotal
            FROM order_items i
            JOIN orders o ON o.id = i.order_id
            WHERE o.farmer_id = :farmerId
              AND o.id = :orderId
            ORDER BY i.id
            """;

    private static final String MY_ORDERS =
            """
            SELECT o.id AS order_id, o.order_code, u.full_name AS customer_name, m.market_name,
                   o.pickup_date, o.pickup_start, o.pickup_end, o.cutoff_at, o.total_amount,
                   o.status, COUNT(i.id) AS item_count
            FROM orders o
            JOIN users u   ON u.id = o.customer_id
            JOIN markets m ON m.id = o.market_id
            LEFT JOIN order_items i ON i.order_id = o.id
            WHERE o.farmer_id = :farmerId
              AND (:status IS NULL OR o.status = :status)
              AND (:pickupDate IS NULL OR o.pickup_date = :pickupDate)
            GROUP BY o.id, o.order_code, u.full_name, m.market_name, o.pickup_date, o.pickup_start,
                     o.pickup_end, o.cutoff_at, o.total_amount, o.status
            ORDER BY o.pickup_date, o.pickup_start, o.order_code
            LIMIT :limit
            """;

    /** Still waiting to be accepted, and the stall is running out of time to decide. */
    private static final String CUTOFF_SOON =
            """
            SELECT o.id AS order_id, o.order_code, u.full_name AS customer_name, m.market_name,
                   o.pickup_date, o.pickup_start, o.pickup_end, o.cutoff_at, o.total_amount,
                   o.status, COUNT(i.id) AS item_count
            FROM orders o
            JOIN users u   ON u.id = o.customer_id
            JOIN markets m ON m.id = o.market_id
            LEFT JOIN order_items i ON i.order_id = o.id
            WHERE o.farmer_id = :farmerId
              AND o.status = 'placed'
              AND o.cutoff_at <= :until
            GROUP BY o.id, o.order_code, u.full_name, m.market_name, o.pickup_date, o.pickup_start,
                     o.pickup_end, o.cutoff_at, o.total_amount, o.status
            ORDER BY o.cutoff_at
            LIMIT :limit
            """;

    private static final String MY_PRODUCTS =
            """
            SELECT p.id AS product_id, p.name, p.price, p.unit, p.stock_quantity, p.status,
                   COALESCE(SUM(CASE WHEN o.status IN ('placed','accepted','ready')
                                     THEN i.quantity ELSE 0 END), 0) AS reserved
            FROM products p
            LEFT JOIN order_items i ON i.product_id = p.id
            LEFT JOIN orders o      ON o.id = i.order_id
            WHERE p.farmer_id = :farmerId
              AND p.is_deleted = FALSE
              AND (:status IS NULL OR p.status = :status)
            GROUP BY p.id, p.name, p.price, p.unit, p.stock_quantity, p.status
            HAVING (:lowStock = FALSE OR p.stock_quantity <= :lowStockThreshold)
            ORDER BY p.stock_quantity, p.name
            LIMIT :limit
            """;

    private static final String MY_SALES =
            """
            SELECT COUNT(*) AS order_count, COALESCE(SUM(total_amount), 0) AS revenue
            FROM orders
            WHERE farmer_id = :farmerId
              AND status = 'completed'
              AND pickup_date BETWEEN :fromDate AND :toDate
            """;

    private static final String BEST_SELLERS =
            """
            SELECT i.product_name, i.unit, SUM(i.quantity) AS quantity_sold,
                   SUM(i.subtotal) AS revenue
            FROM order_items i
            JOIN orders o ON o.id = i.order_id
            WHERE o.farmer_id = :farmerId
              AND o.status = 'completed'
              AND o.pickup_date BETWEEN :fromDate AND :toDate
            GROUP BY i.product_name, i.unit
            ORDER BY quantity_sold DESC
            LIMIT 5
            """;

    private static final String MY_REVIEWS =
            """
            SELECT r.id AS review_id, r.rating, r.comment, u.full_name AS customer_name,
                   COALESCE(p.name, f.stall_name) AS target_name, DATE(r.created_at) AS created_on,
                   (rr.id IS NOT NULL) AS answered
            FROM reviews r
            JOIN users u            ON u.id = r.customer_id
            JOIN orders o           ON o.id = r.order_id
            JOIN farmer_profiles f  ON f.id = o.farmer_id
            LEFT JOIN products p    ON p.id = r.product_id
            LEFT JOIN review_responses rr ON rr.review_id = r.id
            WHERE o.farmer_id = :farmerId
              AND r.status = 'visible'
              AND (:onlyUnanswered = FALSE OR rr.id IS NULL)
            ORDER BY r.created_at DESC
            LIMIT :limit
            """;

    private static final String MY_SCHEDULE =
            """
            SELECT m.market_name, fod.day_of_week, fod.pickup_start_time, fod.pickup_end_time
            FROM farmer_operating_days fod
            JOIN farmer_markets fm ON fm.id = fod.farmer_market_id
            JOIN markets m         ON m.id = fm.market_id
            WHERE fm.farmer_id = :farmerId
              AND m.is_active = TRUE
            ORDER BY fod.day_of_week, m.market_name, fod.pickup_start_time
            LIMIT 30
            """;

    /** FR-093 Overview banner: one round trip, five numbers, all for one pickup date. */
    private static final String BRIEFING =
            """
            SELECT
              (SELECT COUNT(*) FROM orders
                 WHERE farmer_id = :farmerId AND pickup_date = :onDate
                   AND status NOT IN ('declined','cancelled'))            AS orders_today,
              (SELECT COUNT(*) FROM orders
                 WHERE farmer_id = :farmerId AND pickup_date = :onDate
                   AND status = 'placed')                                 AS waiting,
              (SELECT COUNT(*) FROM orders
                 WHERE farmer_id = :farmerId AND pickup_date = :onDate
                   AND status = 'placed' AND cutoff_at < :now)            AS cutoff_passed,
              (SELECT COUNT(*) FROM products
                 WHERE farmer_id = :farmerId AND is_deleted = FALSE
                   AND status = 'sold_out')                               AS sold_out,
              (SELECT COUNT(*) FROM products
                 WHERE farmer_id = :farmerId AND is_deleted = FALSE
                   AND status = 'available'
                   AND stock_quantity <= :lowStock)                       AS low_stock
            """;

    /**
     * One order of this stall, found by the code the person typed. Another stall's code finds
     * nothing.
     */
    private static final String MY_ORDER_BY_CODE =
            """
            SELECT o.id AS order_id, o.order_code, u.full_name AS customer_name, m.market_name,
                   o.pickup_date, o.pickup_start, o.pickup_end, o.cutoff_at, o.total_amount,
                   o.status, COUNT(i.id) AS item_count
            FROM orders o
            JOIN users u   ON u.id = o.customer_id
            JOIN markets m ON m.id = o.market_id
            LEFT JOIN order_items i ON i.order_id = o.id
            WHERE o.farmer_id = :farmerId
              AND o.order_code = :orderCode
            GROUP BY o.id, o.order_code, u.full_name, m.market_name, o.pickup_date, o.pickup_start,
                     o.pickup_end, o.cutoff_at, o.total_amount, o.status
            """;

    private final NamedParameterJdbcTemplate jdbc;

    /** Vietnam time ({@code ChatConfig}), the zone {@code orders.cutoff_at} is written in. */
    private final Clock clock;

    public Optional<OrderRow> myOrderByCode(long farmerId, String orderCode) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("orderCode", orderCode);
        return jdbc.query(MY_ORDER_BY_CODE, params, FarmerKnowledgeRepository::orderRow).stream()
                .findFirst();
    }

    public BriefingRow briefing(long farmerId, LocalDate onDate, int lowStockThreshold) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("onDate", onDate)
                        .addValue("now", LocalDateTime.now(clock))
                        .addValue("lowStock", lowStockThreshold);
        BriefingRow row =
                jdbc.queryForObject(
                        BRIEFING,
                        params,
                        (rs, i) ->
                                new BriefingRow(
                                        rs.getLong("orders_today"),
                                        rs.getLong("waiting"),
                                        rs.getLong("cutoff_passed"),
                                        rs.getLong("sold_out"),
                                        rs.getLong("low_stock")));
        return row == null ? new BriefingRow(0, 0, 0, 0, 0) : row;
    }

    public List<OrderItemRow> myOrderItems(long farmerId, long orderId) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("orderId", orderId);
        return jdbc.query(
                MY_ORDER_ITEMS,
                params,
                (rs, i) ->
                        new OrderItemRow(
                                rs.getString("product_name"),
                                rs.getInt("quantity"),
                                rs.getString("unit"),
                                rs.getBigDecimal("subtotal")));
    }

    /** The name of a stall, so a Farmer tool result can say whose numbers it holds. */
    public Optional<String> stallName(long farmerId) {
        return jdbc
                .queryForList(
                        STALL_NAME, new MapSqlParameterSource("farmerId", farmerId), String.class)
                .stream()
                .findFirst();
    }

    /** The stall this account owns, or empty when it owns none. Resolved from the JWT's user id. */
    public Optional<Long> farmerIdOf(long userId) {
        return jdbc
                .queryForList(
                        FARMER_ID_OF_USER, new MapSqlParameterSource("userId", userId), Long.class)
                .stream()
                .findFirst();
    }

    public List<OrderRow> myOrders(long farmerId, String status, LocalDate pickupDate) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("status", status, Types.VARCHAR)
                        .addValue("pickupDate", pickupDate, Types.DATE)
                        .addValue("limit", ROW_LIMIT);
        return jdbc.query(MY_ORDERS, params, FarmerKnowledgeRepository::orderRow);
    }

    public List<OrderRow> cutoffSoon(long farmerId, int hours) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("until", LocalDateTime.now(clock).plusHours(hours))
                        .addValue("limit", ROW_LIMIT);
        return jdbc.query(CUTOFF_SOON, params, FarmerKnowledgeRepository::orderRow);
    }

    public List<ProductStockRow> myProducts(
            long farmerId, String status, boolean lowStock, int threshold) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("status", status, Types.VARCHAR)
                        .addValue("lowStock", lowStock)
                        .addValue("lowStockThreshold", threshold)
                        .addValue("limit", ROW_LIMIT);
        return jdbc.query(
                MY_PRODUCTS,
                params,
                (rs, i) ->
                        new ProductStockRow(
                                rs.getLong("product_id"),
                                rs.getString("name"),
                                rs.getBigDecimal("price"),
                                rs.getString("unit"),
                                rs.getInt("stock_quantity"),
                                rs.getInt("reserved"),
                                rs.getString("status")));
    }

    public SalesRow mySales(long farmerId, LocalDate from, LocalDate to) {
        MapSqlParameterSource params = range(farmerId, from, to);
        SalesRow row =
                jdbc.queryForObject(
                        MY_SALES,
                        params,
                        (rs, i) ->
                                new SalesRow(
                                        rs.getLong("order_count"), rs.getBigDecimal("revenue")));
        return row == null ? new SalesRow(0, BigDecimal.ZERO) : row;
    }

    public List<BestSellerRow> bestSellers(long farmerId, LocalDate from, LocalDate to) {
        return jdbc.query(
                BEST_SELLERS,
                range(farmerId, from, to),
                (rs, i) ->
                        new BestSellerRow(
                                rs.getString("product_name"),
                                rs.getString("unit"),
                                rs.getLong("quantity_sold"),
                                rs.getBigDecimal("revenue")));
    }

    public List<FarmerReviewRow> myReviews(long farmerId, boolean onlyUnanswered) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("onlyUnanswered", onlyUnanswered)
                        .addValue("limit", ROW_LIMIT);
        return jdbc.query(
                MY_REVIEWS,
                params,
                (rs, i) ->
                        new FarmerReviewRow(
                                rs.getLong("review_id"),
                                rs.getInt("rating"),
                                rs.getString("comment"),
                                rs.getString("customer_name"),
                                rs.getString("target_name"),
                                rs.getObject("created_on", LocalDate.class),
                                rs.getBoolean("answered")));
    }

    public List<ScheduleDayRow> mySchedule(long farmerId) {
        return jdbc.query(
                MY_SCHEDULE,
                new MapSqlParameterSource("farmerId", farmerId),
                (rs, i) ->
                        new ScheduleDayRow(
                                rs.getString("market_name"),
                                rs.getInt("day_of_week"),
                                rs.getObject("pickup_start_time", java.time.LocalTime.class),
                                rs.getObject("pickup_end_time", java.time.LocalTime.class)));
    }

    private static MapSqlParameterSource range(long farmerId, LocalDate from, LocalDate to) {
        return new MapSqlParameterSource()
                .addValue("farmerId", farmerId)
                .addValue("fromDate", from)
                .addValue("toDate", to);
    }

    private static OrderRow orderRow(java.sql.ResultSet rs, int index)
            throws java.sql.SQLException {
        return new OrderRow(
                rs.getLong("order_id"),
                rs.getString("order_code"),
                rs.getString("customer_name"),
                rs.getString("market_name"),
                rs.getObject("pickup_date", LocalDate.class),
                rs.getObject("pickup_start", java.time.LocalTime.class),
                rs.getObject("pickup_end", java.time.LocalTime.class),
                rs.getObject("cutoff_at", java.time.LocalDateTime.class),
                rs.getBigDecimal("total_amount"),
                rs.getString("status"),
                rs.getInt("item_count"));
    }
}
