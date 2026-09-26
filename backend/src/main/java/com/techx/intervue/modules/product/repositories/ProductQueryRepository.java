package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.requests.ProductSearchCriteria;
import com.techx.intervue.modules.product.resources.ProductDetailRow;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Đọc sản phẩm cho trang public. JdbcTemplate vì join 5 bảng và lọc theo chợ/thứ; mọi giá trị người
 * dùng đi qua tham số, `sort` qua whitelist — không có chỗ nào nối chuỗi vào SQL (R-04).
 */
@Repository
@RequiredArgsConstructor
public class ProductQueryRepository {

    /**
     * Một chỗ duy nhất định nghĩa "sản phẩm nào khách được thấy" (D-09, FR-074). Mọi câu public dán
     * mảnh này vào.
     */
    public static final String VISIBILITY_FILTER =
            """
              AND p.is_deleted = FALSE
              AND p.is_hidden = FALSE
              AND f.approval_status = 'approved'
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
     * Một Farmer bán ở hai chợ nhân đôi dòng qua farmer_markets — GROUP BY gộp lại, MIN() chọn một
     * chợ.
     */
    private static final String SELECT_ITEM =
            """
            SELECT p.id, p.name, p.price, p.unit, p.stock_quantity, p.image_url, p.status,
                   p.rating_avg, p.rating_count, p.description,
                   f.id AS farmer_id, f.stall_name,
                   c.id AS category_id, c.name AS category_name,
                   MIN(m.id) AS market_id, MIN(m.market_name) AS market_name
            """;

    private static final String GROUP_BY =
            """
            GROUP BY p.id, p.name, p.price, p.unit, p.stock_quantity, p.image_url, p.status,
                     p.rating_avg, p.rating_count, p.description, f.id, f.stall_name, c.id, c.name
            """;

    public static final String SEARCH_SQL =
            SELECT_ITEM + FROM + VISIBILITY_FILTER + FILTERS + GROUP_BY;

    private static final String COUNT_SQL =
            "SELECT COUNT(DISTINCT p.id) " + FROM + VISIBILITY_FILTER + FILTERS;

    public static final String DETAIL_SQL =
            SELECT_ITEM + FROM + VISIBILITY_FILTER + "  AND p.id = :id\n" + GROUP_BY;

    private final NamedParameterJdbcTemplate jdbc;

    /** Whitelist sort — giá trị từ query string KHÔNG bao giờ đi thẳng vào ORDER BY (R-04). */
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
        // orderBy đã qua whitelist ở trên; p.id nối sau để thứ tự ổn định giữa hai trang.
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
                rs.getInt("rating_count"));
    }

    /** '%' và '_' người dùng gõ không được thành ký tự đại diện. */
    private static String escapeLike(String raw) {
        return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
