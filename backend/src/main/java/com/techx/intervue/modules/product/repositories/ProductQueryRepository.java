package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.requests.ProductSearchCriteria;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.modules.product.resources.ProductDetailRow;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.modules.product.resources.ShelfLifeResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads products for the public pages. JdbcTemplate because it joins 5 tables and filters by
 * market/weekday; every user value goes through parameters, `sort` through a whitelist — nowhere
 * concatenates a string into SQL (R-04).
 */
@Repository
@RequiredArgsConstructor
public class ProductQueryRepository {

    /**
     * The single place that defines "which products a customer may see" (D-09, FR-074). Every
     * public statement pastes this fragment in. FR-063 daily stock: a product with no active weekly
     * template is never orderable on any date, so it is left out here — in the SQL, never after
     * paging, or a page would come back short and its total wrong.
     */
    public static final String VISIBILITY_FILTER =
            """
              AND p.is_deleted = FALSE
              AND p.is_hidden = FALSE
              AND f.approval_status = 'approved'
              AND EXISTS (SELECT 1 FROM weekly_stock_templates t
                          WHERE t.product_id = p.id AND t.is_active = TRUE)
            """;

    private static final String FROM =
            """
            FROM products p
            JOIN farmer_profiles f ON f.id = p.farmer_id
            JOIN categories c ON c.id = p.category_id
            LEFT JOIN farmer_markets fm ON fm.farmer_id = f.id AND fm.is_active = TRUE
            LEFT JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            WHERE 1 = 1
            """;

    private static final String FILTERS =
            """
              AND (:q IS NULL OR p.name LIKE :q ESCAPE '!' OR c.name LIKE :q ESCAPE '!')
              AND (:categoryId IS NULL OR p.category_id = :categoryId)
              AND (:farmerId IS NULL OR p.farmer_id = :farmerId)
              AND (:marketId IS NULL OR fm.market_id = :marketId)
              AND (:minPrice IS NULL OR p.price >= :minPrice)
              AND (:maxPrice IS NULL OR p.price <= :maxPrice)
              AND (:day IS NULL OR EXISTS (SELECT 1 FROM farmer_operating_days d
                                            WHERE d.farmer_market_id = fm.id AND d.day_of_week = :day))
            """;

    /**
     * A Farmer selling at two markets doubles rows through farmer_markets — GROUP BY merges them,
     * MIN() picks one market.
     */
    private static final String SELECT_ITEM =
            """
            SELECT p.id, p.name, p.price, p.unit, p.stock_quantity, p.image_url, p.status,
                   p.rating_avg, p.rating_count, p.description, p.shelf_life_days,
                   f.id AS farmer_id, f.stall_name,
                   c.id AS category_id, c.name AS category_name,
                   MIN(m.id) AS market_id, MIN(m.market_name) AS market_name
            """;

    private static final String GROUP_BY =
            """
            GROUP BY p.id, p.name, p.price, p.unit, p.stock_quantity, p.image_url, p.status,
                     p.rating_avg, p.rating_count, p.description, p.shelf_life_days, f.id,
                     f.stall_name, c.id, c.name
            """;

    public static final String SEARCH_SQL =
            SELECT_ITEM + FROM + VISIBILITY_FILTER + FILTERS + GROUP_BY;

    private static final String COUNT_SQL =
            "SELECT COUNT(DISTINCT p.id) " + FROM + VISIBILITY_FILTER + FILTERS;

    public static final String DETAIL_SQL =
            SELECT_ITEM + FROM + VISIBILITY_FILTER + "  AND p.id = :id\n" + GROUP_BY;

    /**
     * The Farmer's own list: skip soft-deleted products, but KEEP products hidden by an admin (with
     * the reason) and every approval state of the stall — the Farmer must see their goods even when
     * the stall is suspended (D-09).
     */
    public static final String MINE_SQL =
            """
            SELECT p.id, p.name, p.price, p.unit, p.stock_quantity, p.image_url, p.status,
                   p.rating_avg, p.rating_count, p.description, p.shelf_life_days, p.is_hidden,
                   p.hidden_reason,
                   f.id AS farmer_id, f.stall_name,
                   c.id AS category_id, c.name AS category_name,
                   NULL AS market_id, NULL AS market_name
            FROM products p
            JOIN farmer_profiles f ON f.id = p.farmer_id
            JOIN categories c ON c.id = p.category_id
            WHERE p.farmer_id = :farmerId
              AND p.is_deleted = FALSE
              AND (:status IS NULL OR p.status = :status)
            ORDER BY p.created_at DESC, p.id
            LIMIT :limit OFFSET :offset
            """;

    private static final String MINE_COUNT_SQL =
            """
            SELECT COUNT(*) FROM products p
            WHERE p.farmer_id = :farmerId
              AND p.is_deleted = FALSE
              AND (:status IS NULL OR p.status = :status)
            """;

    public static final String MINE_DELETED_SQL =
            """
            SELECT p.id, p.name, p.price, p.unit, p.stock_quantity, p.image_url, p.status,
                   p.rating_avg, p.rating_count, p.description, p.shelf_life_days, p.is_hidden,
                   p.hidden_reason,
                   f.id AS farmer_id, f.stall_name,
                   c.id AS category_id, c.name AS category_name,
                   NULL AS market_id, NULL AS market_name
            FROM products p
            JOIN farmer_profiles f ON f.id = p.farmer_id
            JOIN categories c ON c.id = p.category_id
            WHERE p.farmer_id = :farmerId
              AND p.is_deleted = TRUE
            ORDER BY p.updated_at DESC, p.id
            LIMIT :limit OFFSET :offset
            """;

    private static final String MINE_DELETED_COUNT_SQL =
            """
            SELECT COUNT(*) FROM products p
            WHERE p.farmer_id = :farmerId
              AND p.is_deleted = TRUE
            """;

    /**
     * FR-074: every listing the Admin has hidden, newest change first, so a hidden listing can be
     * found again and unhidden.
     */
    public static final String HIDDEN_SQL =
            """
            SELECT p.id, p.name, p.price, p.unit, p.stock_quantity, p.image_url, p.status,
                   p.rating_avg, p.rating_count, p.description, p.shelf_life_days, p.is_hidden,
                   p.hidden_reason,
                   f.id AS farmer_id, f.stall_name,
                   c.id AS category_id, c.name AS category_name,
                   NULL AS market_id, NULL AS market_name
            FROM products p
            JOIN farmer_profiles f ON f.id = p.farmer_id
            JOIN categories c ON c.id = p.category_id
            WHERE p.is_hidden = TRUE
              AND p.is_deleted = FALSE
            ORDER BY p.updated_at DESC, p.id
            LIMIT :limit OFFSET :offset
            """;

    private static final String HIDDEN_COUNT_SQL =
            """
            SELECT COUNT(*) FROM products p
            WHERE p.is_hidden = TRUE
              AND p.is_deleted = FALSE
            """;

    /**
     * Units that orders still holding stock (placed, accepted, ready — D-02) take per product and
     * pickup date. Declined and cancelled orders gave their stock back; completed ones were handed
     * over.
     */
    private static final String RESERVED_SQL =
            """
            SELECT oi.product_id, o.pickup_date, SUM(oi.quantity) AS reserved
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id IN (:productIds)
              AND o.pickup_date IN (:dates)
              AND o.status IN ('placed', 'accepted', 'ready')
            GROUP BY oi.product_id, o.pickup_date
            """;

    private final NamedParameterJdbcTemplate jdbc;

    /**
     * For each product, the units active orders hold for the one pickup date given for it; a
     * product with none is absent from the map.
     */
    public Map<Long, Integer> reservedOn(Map<Long, LocalDate> dateByProductId) {
        if (dateByProductId.isEmpty()) {
            return Map.of();
        }
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("productIds", dateByProductId.keySet())
                        .addValue("dates", new HashSet<>(dateByProductId.values()));
        Map<Long, Integer> reserved = new HashMap<>();
        jdbc.query(
                RESERVED_SQL,
                params,
                rs -> {
                    long productId = rs.getLong("product_id");
                    LocalDate date = rs.getObject("pickup_date", LocalDate.class);
                    if (date.equals(dateByProductId.get(productId))) {
                        reserved.put(productId, rs.getInt("reserved"));
                    }
                });
        return reserved;
    }

    public PageResource<FarmerProductResource> mine(
            long farmerId, String status, int offset, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("status", status);
        Long total = jdbc.queryForObject(MINE_COUNT_SQL, params, Long.class);
        params.addValue("limit", limit).addValue("offset", offset);
        List<FarmerProductResource> items =
                jdbc.query(
                        MINE_SQL,
                        params,
                        (rs, i) ->
                                new FarmerProductResource(
                                        item(rs),
                                        rs.getString("description"),
                                        rs.getBoolean("is_hidden"),
                                        rs.getString("hidden_reason")));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    public PageResource<FarmerProductResource> hidden(int offset, int limit) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        Long total = jdbc.queryForObject(HIDDEN_COUNT_SQL, params, Long.class);
        params.addValue("limit", limit).addValue("offset", offset);
        List<FarmerProductResource> items =
                jdbc.query(
                        HIDDEN_SQL,
                        params,
                        (rs, i) ->
                                new FarmerProductResource(
                                        item(rs),
                                        rs.getString("description"),
                                        rs.getBoolean("is_hidden"),
                                        rs.getString("hidden_reason")));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    public PageResource<FarmerProductResource> mineDeleted(long farmerId, int offset, int limit) {
        MapSqlParameterSource params = new MapSqlParameterSource("farmerId", farmerId);
        Long total = jdbc.queryForObject(MINE_DELETED_COUNT_SQL, params, Long.class);
        params.addValue("limit", limit).addValue("offset", offset);
        List<FarmerProductResource> items =
                jdbc.query(
                        MINE_DELETED_SQL,
                        params,
                        (rs, i) ->
                                new FarmerProductResource(
                                        item(rs),
                                        rs.getString("description"),
                                        rs.getBoolean("is_hidden"),
                                        rs.getString("hidden_reason")));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    /** Whitelist sort — a value from the query string NEVER goes straight into ORDER BY (R-04). */
    public static String orderBy(String sort) {
        return switch (sort == null ? "" : sort) {
            case "price_asc" -> "p.price ASC";
            case "price_desc" -> "p.price DESC";
            case "rating" -> "p.rating_avg DESC";
            default -> "p.created_at DESC";
        };
    }

    public PageResource<ProductListItemResource> search(
            ProductSearchCriteria c, String orderBy, int offset, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue(
                                "q",
                                c.q() == null || c.q().isBlank()
                                        ? null
                                        : "%" + escapeLike(c.q()) + "%")
                        .addValue("categoryId", c.categoryId())
                        .addValue("farmerId", c.farmerId())
                        .addValue("marketId", c.marketId())
                        .addValue("minPrice", c.minPrice())
                        .addValue("maxPrice", c.maxPrice())
                        .addValue("day", c.day());
        Long total = jdbc.queryForObject(COUNT_SQL, params, Long.class);
        params.addValue("limit", limit).addValue("offset", offset);
        // orderBy has already gone through the whitelist above; p.id is appended so the order is
        // stable between two pages.
        List<ProductListItemResource> items =
                jdbc.query(
                        SEARCH_SQL + " ORDER BY " + orderBy + ", p.id LIMIT :limit OFFSET :offset",
                        params,
                        (rs, i) -> item(rs));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    public Optional<ProductDetailRow> findVisibleById(long id) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("q", null)
                        .addValue("categoryId", null)
                        .addValue("farmerId", null)
                        .addValue("marketId", null)
                        .addValue("minPrice", null)
                        .addValue("maxPrice", null)
                        .addValue("day", null);
        List<ProductDetailRow> rows =
                jdbc.query(
                        DETAIL_SQL,
                        params,
                        (rs, i) -> new ProductDetailRow(item(rs), rs.getString("description")));
        return rows.stream().findFirst();
    }

    /** FR-121: one product's stored shelf-life block for its public page. */
    public static final String SHELF_LIFE_SQL =
            """
            SELECT p.shelf_life_guide_id, g.group_name, p.storage_mode, p.shelf_life_days,
                   p.suggested_shelf_life_days, p.shelf_life_extended
            FROM products p
            LEFT JOIN shelf_life_guides g ON g.id = p.shelf_life_guide_id
            WHERE p.id = :id
            """;

    public Optional<ShelfLifeResource> shelfLife(long productId) {
        return jdbc
                .query(
                        SHELF_LIFE_SQL,
                        new MapSqlParameterSource("id", productId),
                        (rs, i) -> {
                            long guideId = rs.getLong("shelf_life_guide_id");
                            Long guide = rs.wasNull() ? null : guideId;
                            int suggested = rs.getInt("suggested_shelf_life_days");
                            Integer suggestedDays = rs.wasNull() ? null : suggested;
                            return new ShelfLifeResource(
                                    guide,
                                    rs.getString("group_name"),
                                    rs.getString("storage_mode"),
                                    rs.getInt("shelf_life_days"),
                                    suggestedDays,
                                    rs.getBoolean("shelf_life_extended"));
                        })
                .stream()
                .findFirst();
    }

    private static ProductListItemResource item(ResultSet rs) throws SQLException {
        long marketId = rs.getLong("market_id");
        return new ProductListItemResource(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getLong("farmer_id"),
                rs.getString("stall_name"),
                rs.wasNull() ? null : marketId,
                rs.getString("market_name"),
                rs.getLong("category_id"),
                rs.getString("category_name"),
                rs.getBigDecimal("price"),
                rs.getString("unit"),
                rs.getInt("stock_quantity"),
                rs.getString("image_url"),
                rs.getString("status"),
                rs.getBigDecimal("rating_avg"),
                rs.getInt("rating_count"),
                rs.getInt("shelf_life_days"),
                null);
    }

    /** '%' and '_' typed by the user must not act as wildcards. */
    private static String escapeLike(String raw) {
        return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
