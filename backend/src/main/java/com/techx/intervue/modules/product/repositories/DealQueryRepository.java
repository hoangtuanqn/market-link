package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.resources.FarmerDealResource;
import java.time.LocalDate;
import java.util.List;
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
}
