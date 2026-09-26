package com.techx.intervue.modules.report.repositories;

import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.resources.AdminDashboardResource;
import com.techx.intervue.modules.report.resources.RevenueByMarketResource;
import com.techx.intervue.modules.report.resources.TopFarmerResource;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * FR-070/075 platform-wide aggregates. Revenue is {@code completed} orders only, everywhere, so the
 * dashboard total equals the sum of the per-market and per-stall reports.
 */
@Repository
@RequiredArgsConstructor
public class AdminReportRepository {

    public static final String DASHBOARD_SQL =
            """
            SELECT (SELECT COUNT(*) FROM farmer_profiles WHERE approval_status = 'approved') AS total_farmers,
                   (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
                   (SELECT COUNT(*) FROM markets WHERE is_active = TRUE) AS total_markets,
                   (SELECT COUNT(*) FROM orders) AS total_orders,
                   (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed') AS revenue_total,
                   (SELECT COUNT(*) FROM farmer_profiles WHERE approval_status = 'pending') AS pending_farmers,
                   (SELECT COUNT(*) FROM products WHERE is_hidden = TRUE AND is_deleted = FALSE) AS hidden_listings
            """;

    /** Every market, including ones with no completed order yet (revenue 0). */
    public static final String REVENUE_BY_MARKET_SQL =
            """
            SELECT m.id AS market_id, m.market_name,
                   COUNT(o.id) AS order_count, COALESCE(SUM(o.total_amount), 0) AS revenue
            FROM markets m
            LEFT JOIN orders o ON o.market_id = m.id
              AND o.status = 'completed'
            """
                    + OrderRows.RANGE_FILTER
                    + """
            GROUP BY m.id, m.market_name
            ORDER BY revenue DESC, m.market_name
            """;

    public static final String TOP_FARMERS_SQL =
            """
            SELECT f.id AS farmer_id, f.stall_name, f.rating_avg,
                   COUNT(o.id) AS order_count, COALESCE(SUM(o.total_amount), 0) AS revenue
            FROM orders o
            JOIN farmer_profiles f ON f.id = o.farmer_id
            WHERE o.status = 'completed'
            """
                    + OrderRows.RANGE_FILTER
                    + """
            GROUP BY f.id, f.stall_name, f.rating_avg
            ORDER BY revenue DESC, order_count DESC, f.stall_name
            LIMIT :limit
            """;

    private static final String ORDERS_WHERE =
            """
            WHERE (:marketId IS NULL OR o.market_id = :marketId)
              AND (:status IS NULL OR o.status = :status)
            """
                    + OrderRows.RANGE_FILTER;

    /**
     * {@code GET /admin/reports/orders}: platform-wide, newest first (admin is read-only, D-04).
     */
    public static final String ORDERS_SQL =
            OrderRows.LIST_COLUMNS
                    + OrderRows.LIST_FROM
                    + ORDERS_WHERE
                    + "ORDER BY o.created_at DESC, o.id DESC\nLIMIT :limit OFFSET :offset";

    private static final String ORDERS_COUNT_SQL =
            "SELECT COUNT(*) " + OrderRows.LIST_FROM + ORDERS_WHERE;

    private final NamedParameterJdbcTemplate jdbc;
    private final OrderRows rows;

    public AdminDashboardResource dashboard() {
        var r = jdbc.queryForMap(DASHBOARD_SQL, new MapSqlParameterSource());
        return new AdminDashboardResource(
                FarmerReportRepository.asLong(r.get("total_farmers")),
                FarmerReportRepository.asLong(r.get("total_customers")),
                FarmerReportRepository.asLong(r.get("total_markets")),
                FarmerReportRepository.asLong(r.get("total_orders")),
                (BigDecimal) r.get("revenue_total"),
                FarmerReportRepository.asLong(r.get("pending_farmers")),
                FarmerReportRepository.asLong(r.get("hidden_listings")));
    }

    public List<RevenueByMarketResource> revenueByMarket(LocalDate from, LocalDate to) {
        return jdbc.query(
                REVENUE_BY_MARKET_SQL,
                FarmerReportRepository.range(from, to),
                (rs, i) ->
                        new RevenueByMarketResource(
                                rs.getLong("market_id"),
                                rs.getString("market_name"),
                                rs.getLong("order_count"),
                                rs.getBigDecimal("revenue")));
    }

    public List<TopFarmerResource> topFarmers(LocalDate from, LocalDate to, int limit) {
        return jdbc.query(
                TOP_FARMERS_SQL,
                FarmerReportRepository.range(from, to).addValue("limit", limit),
                (rs, i) ->
                        new TopFarmerResource(
                                rs.getLong("farmer_id"),
                                rs.getString("stall_name"),
                                rs.getLong("order_count"),
                                rs.getBigDecimal("revenue"),
                                rs.getBigDecimal("rating_avg")));
    }

    public PageResource<OrderListItemResource> orders(
            LocalDate from, LocalDate to, Long marketId, String status, int page, int pageSize) {
        MapSqlParameterSource params =
                FarmerReportRepository.range(from, to)
                        .addValue("marketId", marketId, Types.BIGINT)
                        .addValue("status", status, Types.VARCHAR)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<OrderListItemResource> items = jdbc.query(ORDERS_SQL, params, rows::map);
        Long total = jdbc.queryForObject(ORDERS_COUNT_SQL, params, Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }
}
