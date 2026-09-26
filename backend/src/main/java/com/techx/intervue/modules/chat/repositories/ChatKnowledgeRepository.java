package com.techx.intervue.modules.chat.repositories;

import com.techx.intervue.modules.chat.resources.KnowledgeRows.FarmerRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.MarketRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ProductRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ScheduleRow;
import java.sql.Types;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * The fixed SQL statements the chatbot is allowed to run (R-04). Read-only, every user value goes
 * through parameters — there is no place that concatenates input into SQL.
 */
@Repository
@RequiredArgsConstructor
public class ChatKnowledgeRepository {

    private static final int PRODUCT_LIMIT = 5;

    private static final String SEARCH_PRODUCTS =
            """
            SELECT p.product_id, p.name, p.price, p.unit, p.stock_quantity, p.status,
                   f.farmer_id, f.stall_name, m.market_name
            FROM products p
            JOIN farmer_profiles f ON f.farmer_id = p.farmer_id
            JOIN categories c ON c.category_id = p.category_id
            LEFT JOIN farmer_markets fm ON fm.farmer_id = f.farmer_id AND fm.is_active = TRUE
            LEFT JOIN markets m ON m.market_id = fm.market_id AND m.is_active = TRUE
            WHERE p.is_deleted = FALSE
              AND f.approval_status = 'approved'
              AND p.status IN (:statuses)
              AND (p.name LIKE :keyword ESCAPE '!' OR c.name LIKE :keyword ESCAPE '!')
              AND (:marketId IS NULL OR m.market_id = :marketId)
            ORDER BY p.stock_quantity DESC, p.name
            LIMIT 30
            """;

    private static final String ACTIVE_MARKETS =
            """
            SELECT m.market_id, m.market_name, m.address, m.opening_time, m.closing_time,
                   GROUP_CONCAT(d.day_of_week ORDER BY d.day_of_week) AS days
            FROM markets m
            LEFT JOIN market_operating_days d ON d.market_id = m.market_id
            WHERE m.is_active = TRUE
            GROUP BY m.market_id, m.market_name, m.address, m.opening_time, m.closing_time
            ORDER BY m.market_name
            """;

    private static final String APPROVED_FARMERS =
            """
            SELECT farmer_id, stall_name
            FROM farmer_profiles
            WHERE approval_status = 'approved'
            ORDER BY stall_name
            """;

    private static final String FARMER_SCHEDULES =
            """
            SELECT f.farmer_id, f.stall_name, m.market_id, m.market_name,
                   fod.day_of_week, fod.pickup_start_time, fod.pickup_end_time
            FROM farmer_operating_days fod
            JOIN farmer_markets fm ON fm.farmer_market_id = fod.farmer_market_id
            JOIN farmer_profiles f ON f.farmer_id = fm.farmer_id
            JOIN markets m ON m.market_id = fm.market_id
            WHERE f.approval_status = 'approved'
              AND fm.is_active = TRUE
              AND m.is_active = TRUE
              AND (:farmerId IS NULL OR f.farmer_id = :farmerId)
              AND (:marketId IS NULL OR m.market_id = :marketId)
              AND (:dayOfWeek IS NULL OR fod.day_of_week = :dayOfWeek)
            ORDER BY fod.day_of_week, m.market_name, fod.pickup_start_time
            LIMIT 30
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public List<ProductRow> searchProducts(String keyword, Long marketId, boolean includeSoldOut) {
        List<String> statuses =
                includeSoldOut ? List.of("available", "sold_out") : List.of("available");
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("statuses", statuses)
                        .addValue("keyword", "%" + escapeLike(keyword) + "%")
                        .addValue("marketId", marketId, Types.BIGINT);

        // One product sold at several markets → several rows; merge them by product_id
        Map<Long, ProductRow> products = new LinkedHashMap<>();
        jdbc.query(
                SEARCH_PRODUCTS,
                params,
                rs -> {
                    long productId = rs.getLong("product_id");
                    String marketName = rs.getString("market_name");
                    ProductRow row = products.get(productId);
                    if (row == null) {
                        if (products.size() >= PRODUCT_LIMIT) {
                            return;
                        }
                        row =
                                new ProductRow(
                                        productId,
                                        rs.getString("name"),
                                        rs.getBigDecimal("price"),
                                        rs.getString("unit"),
                                        rs.getInt("stock_quantity"),
                                        rs.getString("status"),
                                        rs.getLong("farmer_id"),
                                        rs.getString("stall_name"),
                                        new ArrayList<>());
                        products.put(productId, row);
                    }
                    if (marketName != null && !row.marketNames().contains(marketName)) {
                        row.marketNames().add(marketName);
                    }
                });
        return List.copyOf(products.values());
    }

    public List<MarketRow> activeMarkets() {
        return jdbc.query(
                ACTIVE_MARKETS,
                (rs, i) ->
                        new MarketRow(
                                rs.getLong("market_id"),
                                rs.getString("market_name"),
                                rs.getString("address"),
                                rs.getObject("opening_time", LocalTime.class),
                                rs.getObject("closing_time", LocalTime.class),
                                parseDays(rs.getString("days"))));
    }

    public List<FarmerRow> approvedFarmers() {
        return jdbc.query(
                APPROVED_FARMERS,
                (rs, i) -> new FarmerRow(rs.getLong("farmer_id"), rs.getString("stall_name")));
    }

    public List<ScheduleRow> farmerSchedules(Long farmerId, Long marketId, Integer dayOfWeek) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId, Types.BIGINT)
                        .addValue("marketId", marketId, Types.BIGINT)
                        .addValue("dayOfWeek", dayOfWeek, Types.TINYINT);
        return jdbc.query(
                FARMER_SCHEDULES,
                params,
                (rs, i) ->
                        new ScheduleRow(
                                rs.getLong("farmer_id"),
                                rs.getString("stall_name"),
                                rs.getLong("market_id"),
                                rs.getString("market_name"),
                                rs.getInt("day_of_week"),
                                rs.getObject("pickup_start_time", LocalTime.class),
                                rs.getObject("pickup_end_time", LocalTime.class)));
    }

    /** Escape LIKE special characters so the keyword is always read as plain text. */
    static String escapeLike(String keyword) {
        return keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    private static List<Integer> parseDays(String days) {
        if (days == null || days.isBlank()) {
            return List.of();
        }
        return Arrays.stream(days.split(",")).map(String::trim).map(Integer::valueOf).toList();
    }
}
