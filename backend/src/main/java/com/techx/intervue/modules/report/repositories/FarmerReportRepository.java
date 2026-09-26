package com.techx.intervue.modules.report.repositories;

import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.resources.BestSellerResource;
import com.techx.intervue.modules.report.resources.FarmerDashboardResource;
import com.techx.intervue.resources.PageResource;
import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * FR-068/069 aggregates for one stall. Revenue and best sellers count {@code completed} orders only
 * — placed/accepted/ready are not sold yet, declined/cancelled never were. Every statement takes
 * {@code farmerId} from the caller's own profile (R-06), never from the request.
 */
@Repository
@RequiredArgsConstructor
public class FarmerReportRepository {

    /** Products at or under this many units count as low stock. */
    public static final int LOW_STOCK = 5;

    public static final String DASHBOARD_SQL =
            """
            SELECT COUNT(*) AS total_orders,
                   COALESCE(SUM(o.status = 'placed'), 0) AS pending_orders,
                   COALESCE(SUM(o.status = 'completed'), 0) AS completed_orders,
                   COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount END), 0) AS revenue_total,
                   COALESCE(SUM(CASE WHEN o.status = 'completed'
                                      AND o.pickup_date >= :monthStart AND o.pickup_date < :nextMonth
                                     THEN o.total_amount END), 0) AS revenue_this_month
            FROM orders o
            WHERE o.farmer_id = :farmerId
            """;

    public static final String STOCK_SQL =
            """
            SELECT COUNT(*) AS product_count,
                   COALESCE(SUM(p.status = 'available' AND p.stock_quantity <= :lowStock), 0) AS low_stock_count
            FROM products p
            WHERE p.farmer_id = :farmerId AND p.is_deleted = FALSE
            """;

    public static final String BEST_SELLERS_SQL =
            """
            SELECT oi.product_id, oi.product_name AS name,
                   SUM(oi.quantity) AS quantity_sold, SUM(oi.subtotal) AS revenue
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.farmer_id = :farmerId
              AND o.status = 'completed'
            """
                    + OrderRows.RANGE_FILTER
                    + """
            GROUP BY oi.product_id, oi.product_name
            ORDER BY quantity_sold DESC, revenue DESC, oi.product_name
            LIMIT :limit
            """;

    private static final String SALES_WHERE =
            """
            WHERE o.farmer_id = :farmerId
              AND o.status = 'completed'
            """
                    + OrderRows.RANGE_FILTER;

    /** {@code GET /farmer/reports/sales}: completed orders, latest pickup first. */
    public static final String SALES_SQL =
            OrderRows.LIST_COLUMNS
                    + OrderRows.LIST_FROM
                    + SALES_WHERE
                    + "ORDER BY o.pickup_date DESC, o.pickup_start DESC, o.id DESC\n"
                    + "LIMIT :limit OFFSET :offset";

    private static final String SALES_COUNT_SQL =
            "SELECT COUNT(*) " + OrderRows.LIST_FROM + SALES_WHERE;

    private final NamedParameterJdbcTemplate jdbc;
    private final OrderRows rows;

    public FarmerDashboardResource dashboard(long farmerId, LocalDate monthStart) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("monthStart", monthStart, Types.DATE)
                        .addValue("nextMonth", monthStart.plusMonths(1), Types.DATE)
                        .addValue("lowStock", LOW_STOCK);
        var orders = jdbc.queryForMap(DASHBOARD_SQL, params);
        var stock = jdbc.queryForMap(STOCK_SQL, params);
        return new FarmerDashboardResource(
                asLong(orders.get("total_orders")),
                asLong(orders.get("pending_orders")),
                (java.math.BigDecimal) orders.get("revenue_total"),
                (java.math.BigDecimal) orders.get("revenue_this_month"),
                asLong(orders.get("completed_orders")),
                asLong(stock.get("product_count")),
                asLong(stock.get("low_stock_count")));
    }

    public List<BestSellerResource> bestSellers(
            long farmerId, LocalDate from, LocalDate to, int limit) {
        MapSqlParameterSource params =
                range(from, to).addValue("farmerId", farmerId).addValue("limit", limit);
        return jdbc.query(
                BEST_SELLERS_SQL,
                params,
                (rs, i) ->
                        new BestSellerResource(
                                rs.getLong("product_id"),
                                rs.getString("name"),
                                rs.getLong("quantity_sold"),
                                rs.getBigDecimal("revenue")));
    }

    public PageResource<OrderListItemResource> sales(
            long farmerId, LocalDate from, LocalDate to, int page, int pageSize) {
        MapSqlParameterSource params =
                range(from, to)
                        .addValue("farmerId", farmerId)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<OrderListItemResource> items = jdbc.query(SALES_SQL, params, rows::map);
        Long total = jdbc.queryForObject(SALES_COUNT_SQL, params, Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }

    static MapSqlParameterSource range(LocalDate from, LocalDate to) {
        return new MapSqlParameterSource()
                .addValue("from", from, Types.DATE)
                .addValue("to", to, Types.DATE);
    }

    static long asLong(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }
}
