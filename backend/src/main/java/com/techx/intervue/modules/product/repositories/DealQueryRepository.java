package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads of near-expiry deals (FR-124, FR-125). JdbcTemplate because they join the stock row with
 * its product and stall; every value goes through parameters (R-04).
 */
@Repository
@RequiredArgsConstructor
public class DealQueryRepository {

    /** The stall's deal days from {@code fromDate} on, for its "On sale" block. */
    public static final String FARMER_DEALS_SQL =
            """
            SELECT d.product_id, p.name, p.unit, d.stock_date, d.quantity_available, d.list_price,
                   d.unit_price, d.discount_percent, d.packed_on, d.best_before,
                   DATEDIFF(d.best_before, d.stock_date) + 1 AS days_left
            FROM product_daily_stock d
            JOIN products p ON p.id = d.product_id
            WHERE p.farmer_id = :farmerId
              AND p.is_deleted = FALSE
              AND d.discount_percent IS NOT NULL
              AND d.stock_date >= :fromDate
            ORDER BY d.stock_date, p.name, d.product_id
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public List<FarmerDealResource> farmerDeals(long farmerId, LocalDate fromDate) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("fromDate", fromDate);
        return jdbc.query(
                FARMER_DEALS_SQL,
                params,
                (rs, i) ->
                        new FarmerDealResource(
                                rs.getLong("product_id"),
                                rs.getString("name"),
                                rs.getString("unit"),
                                rs.getObject("stock_date", LocalDate.class).toString(),
                                rs.getInt("quantity_available"),
                                rs.getBigDecimal("list_price"),
                                rs.getBigDecimal("unit_price"),
                                rs.getInt("discount_percent"),
                                rs.getObject("packed_on", LocalDate.class).toString(),
                                rs.getObject("best_before", LocalDate.class).toString(),
                                rs.getInt("days_left")));
    }

    /**
     * Deal days a customer may see, before the slot check the service adds (spec §4.5.4): on a
     * deal, something left, inside the window, the product listed and for sale at an approved stall
     * ({@link ProductQueryRepository#VISIBILITY_FILTER}). {@code marketId} keeps a day only when
     * the stall is at that market on that weekday and the market is held then.
     */
    public static final String OPEN_DEALS_SQL =
            """
            SELECT d.product_id, d.stock_date, d.quantity_available, d.unit_price, d.list_price,
                   d.discount_percent, d.best_before,
                   DATEDIFF(d.best_before, d.stock_date) + 1 AS days_left,
                   p.name, p.image_url, p.unit, p.storage_mode, f.id AS farmer_id, f.stall_name
            FROM product_daily_stock d
            JOIN products p ON p.id = d.product_id
            JOIN farmer_profiles f ON f.id = p.farmer_id
            WHERE d.discount_percent IS NOT NULL
              AND d.quantity_available > 0
              AND d.stock_date BETWEEN :fromDate AND :toDate
              AND p.status = 'available'
            """
                    + ProductQueryRepository.VISIBILITY_FILTER
                    + """
                      AND (:categoryId IS NULL OR p.category_id = :categoryId)
                      AND (:productId IS NULL OR p.id = :productId)
                      AND (:day IS NULL OR DAYOFWEEK(d.stock_date) - 1 = :day)
                      AND (:marketId IS NULL OR EXISTS (
                            SELECT 1 FROM farmer_markets fm
                            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
                            JOIN farmer_operating_days od ON od.farmer_market_id = fm.id
                                 AND od.day_of_week = DAYOFWEEK(d.stock_date) - 1
                            JOIN market_operating_days mo ON mo.market_id = fm.market_id
                                 AND mo.day_of_week = DAYOFWEEK(d.stock_date) - 1
                            WHERE fm.farmer_id = f.id
                              AND fm.is_active = TRUE
                              AND fm.market_id = :marketId))
                    ORDER BY d.stock_date, d.discount_percent DESC, p.name, p.id
                    """;

    /** Markets per stall and weekday (0 = Sunday) where the stall is and the market is held. */
    public static final String MARKETS_BY_WEEKDAY_SQL =
            """
            SELECT fm.farmer_id, od.day_of_week, m.market_name
            FROM farmer_markets fm
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            JOIN farmer_operating_days od ON od.farmer_market_id = fm.id
            JOIN market_operating_days mo ON mo.market_id = m.id
                 AND mo.day_of_week = od.day_of_week
            WHERE fm.is_active = TRUE
              AND fm.farmer_id IN (:farmerIds)
            ORDER BY fm.farmer_id, od.day_of_week, m.market_name
            """;

    /** One row of {@link #OPEN_DEALS_SQL}. */
    public record DealRow(
            long productId,
            LocalDate stockDate,
            int quantityAvailable,
            BigDecimal unitPrice,
            BigDecimal listPrice,
            int discountPercent,
            LocalDate bestBefore,
            int daysLeft,
            String name,
            String imageUrl,
            String unit,
            String storageMode,
            long farmerId,
            String stallName) {}

    public List<DealRow> openDeals(DealSearchCriteria c, LocalDate fromDate, LocalDate toDate) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("fromDate", fromDate)
                        .addValue("toDate", toDate)
                        .addValue("categoryId", c.categoryId())
                        .addValue("productId", c.productId())
                        .addValue("day", c.day())
                        .addValue("marketId", c.marketId());
        return jdbc.query(
                OPEN_DEALS_SQL,
                params,
                (rs, i) ->
                        new DealRow(
                                rs.getLong("product_id"),
                                rs.getObject("stock_date", LocalDate.class),
                                rs.getInt("quantity_available"),
                                rs.getBigDecimal("unit_price"),
                                rs.getBigDecimal("list_price"),
                                rs.getInt("discount_percent"),
                                rs.getObject("best_before", LocalDate.class),
                                rs.getInt("days_left"),
                                rs.getString("name"),
                                rs.getString("image_url"),
                                rs.getString("unit"),
                                rs.getString("storage_mode"),
                                rs.getLong("farmer_id"),
                                rs.getString("stall_name")));
    }

    /** Stall id → weekday → the market names, sorted by name. */
    public Map<Long, Map<Integer, List<String>>> marketNamesByWeekday(Collection<Long> farmerIds) {
        Map<Long, Map<Integer, List<String>>> out = new HashMap<>();
        if (farmerIds.isEmpty()) {
            return out;
        }
        jdbc.query(
                MARKETS_BY_WEEKDAY_SQL,
                new MapSqlParameterSource("farmerIds", farmerIds),
                rs -> {
                    out.computeIfAbsent(rs.getLong("farmer_id"), k -> new HashMap<>())
                            .computeIfAbsent(rs.getInt("day_of_week"), k -> new ArrayList<>())
                            .add(rs.getString("market_name"));
                });
        return out;
    }
}
