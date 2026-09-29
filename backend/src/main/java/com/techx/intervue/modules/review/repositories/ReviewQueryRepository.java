package com.techx.intervue.modules.review.repositories;

import com.techx.intervue.modules.review.enums.ReviewTarget;
import com.techx.intervue.modules.review.resources.AdminReviewResource;
import com.techx.intervue.modules.review.resources.ReviewResource;
import com.techx.intervue.modules.review.resources.ReviewResponseResource;
import com.techx.intervue.modules.review.resources.ReviewSummaryResource;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ReviewQueryRepository {

    private static final String LIST_COLUMNS =
            """
            SELECT r.id, r.target_type, r.product_id, r.farmer_id, r.rating, r.comment, r.created_at,
                   u.full_name AS customer_name,
                   COALESCE(p.name, f.stall_name) AS target_name,
                   rr.id AS response_id, rr.response_text, rr.created_at AS response_created_at
            FROM reviews r
            JOIN users u ON u.id = r.customer_id
            LEFT JOIN review_responses rr ON rr.review_id = r.id
            LEFT JOIN products p ON p.id = r.product_id
            LEFT JOIN farmer_profiles f ON f.id = r.farmer_id
            """;

    private static final String FOR_PRODUCT_WHERE =
            """
            WHERE r.target_type = 'product' AND r.product_id = :targetId AND r.status = 'visible'
            """;

    private static final String FOR_FARMER_WHERE =
            """
            WHERE r.target_type = 'farmer' AND r.farmer_id = :targetId AND r.status = 'visible'
            """;

    private static final String FOR_STALL_OWNER_WHERE =
            """
            WHERE r.status = 'visible' AND (r.farmer_id = :farmerId OR p.farmer_id = :farmerId)
            """;

    private static final String NEWEST_FIRST =
            "ORDER BY r.created_at DESC, r.id DESC\nLIMIT :limit OFFSET :offset";

    public static final String FOR_PRODUCT_SQL = LIST_COLUMNS + FOR_PRODUCT_WHERE + NEWEST_FIRST;

    public static final String FOR_FARMER_SQL = LIST_COLUMNS + FOR_FARMER_WHERE + NEWEST_FIRST;

    public static final String FOR_STALL_OWNER_SQL =
            LIST_COLUMNS + FOR_STALL_OWNER_WHERE + NEWEST_FIRST;

    private static final String FOR_PRODUCT_COUNT_SQL =
            "SELECT COUNT(*) FROM reviews r " + FOR_PRODUCT_WHERE;
    private static final String FOR_FARMER_COUNT_SQL =
            "SELECT COUNT(*) FROM reviews r " + FOR_FARMER_WHERE;
    private static final String FOR_STALL_OWNER_COUNT_SQL =
            "SELECT COUNT(*) FROM reviews r LEFT JOIN products p ON p.id = r.product_id "
                    + FOR_STALL_OWNER_WHERE;

    private static final String ADMIN_LIST_SQL =
            """
            SELECT r.id, r.target_type, r.product_id, r.farmer_id, r.rating, r.comment, r.created_at,
                   r.status, r.customer_id, u.full_name AS customer_name,
                   COALESCE(p.name, f.stall_name) AS target_name, sp.stall_name,
                   rr.id AS response_id, rr.response_text, rr.created_at AS response_created_at
            FROM reviews r
            JOIN users u ON u.id = r.customer_id
            LEFT JOIN review_responses rr ON rr.review_id = r.id
            LEFT JOIN products p ON p.id = r.product_id
            LEFT JOIN farmer_profiles f ON f.id = r.farmer_id
            LEFT JOIN farmer_profiles sp ON sp.id = COALESCE(r.farmer_id, p.farmer_id)
            WHERE (:status IS NULL OR r.status = :status)
              AND (:maxRating IS NULL OR r.rating <= :maxRating)
              AND (:customerId IS NULL OR r.customer_id = :customerId)
            ORDER BY r.created_at DESC, r.id DESC
            LIMIT :limit OFFSET :offset
            """;

    private static final String ADMIN_LIST_COUNT_SQL =
            """
            SELECT COUNT(*)
            FROM reviews r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:maxRating IS NULL OR r.rating <= :maxRating)
              AND (:customerId IS NULL OR r.customer_id = :customerId)
            """;

    public static final String SUMMARY_SQL =
            """
            SELECT rating, COUNT(*) AS n
            FROM reviews
            WHERE status = 'visible'
              AND target_type = :targetType
              AND (CASE target_type WHEN 'product' THEN product_id ELSE farmer_id END) = :targetId
            GROUP BY rating
            """;

    public static final String RECOMPUTE_PRODUCT_SQL =
            """
            UPDATE products p
            SET p.rating_avg = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r
                                         WHERE r.target_type = 'product' AND r.product_id = :id
                                           AND r.status = 'visible'), 0),
                p.rating_count = (SELECT COUNT(*) FROM reviews r
                                  WHERE r.target_type = 'product' AND r.product_id = :id
                                    AND r.status = 'visible')
            WHERE p.id = :id
            """;

    public static final String RECOMPUTE_FARMER_SQL =
            """
            UPDATE farmer_profiles f
            SET f.rating_avg = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r
                                         WHERE r.target_type = 'farmer' AND r.farmer_id = :id
                                           AND r.status = 'visible'), 0),
                f.rating_count = (SELECT COUNT(*) FROM reviews r
                                  WHERE r.target_type = 'farmer' AND r.farmer_id = :id
                                    AND r.status = 'visible')
            WHERE f.id = :id
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<ReviewResource> forProduct(long productId, int page, int pageSize) {
        return page(FOR_PRODUCT_SQL, FOR_PRODUCT_COUNT_SQL, productId, page, pageSize);
    }

    public PageResource<ReviewResource> forFarmer(long farmerId, int page, int pageSize) {
        return page(FOR_FARMER_SQL, FOR_FARMER_COUNT_SQL, farmerId, page, pageSize);
    }

    public PageResource<ReviewResource> forStallOwner(long farmerId, int page, int pageSize) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<ReviewResource> items =
                jdbc.query(FOR_STALL_OWNER_SQL, params, ReviewQueryRepository::mapReview);
        Long total = jdbc.queryForObject(FOR_STALL_OWNER_COUNT_SQL, params, Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }

    public PageResource<AdminReviewResource> adminList(
            String status, Integer maxRating, Long customerId, int page, int pageSize) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("status", status, Types.VARCHAR)
                        .addValue("maxRating", maxRating, Types.INTEGER)
                        .addValue("customerId", customerId, Types.BIGINT)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<AdminReviewResource> items =
                jdbc.query(ADMIN_LIST_SQL, params, ReviewQueryRepository::mapAdminReview);
        Long total = jdbc.queryForObject(ADMIN_LIST_COUNT_SQL, params, Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }

    private PageResource<ReviewResource> page(
            String listSql, String countSql, long targetId, int page, int pageSize) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("targetId", targetId)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<ReviewResource> items = jdbc.query(listSql, params, ReviewQueryRepository::mapReview);
        Long total = jdbc.queryForObject(countSql, params, Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }

    public ReviewSummaryResource summary(ReviewTarget target, long targetId) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("targetType", target.value())
                        .addValue("targetId", targetId);
        List<Integer> histogram = new ArrayList<>(List.of(0, 0, 0, 0, 0));
        long count = 0;
        long sum = 0;
        for (Map<String, Object> row : jdbc.queryForList(SUMMARY_SQL, params)) {
            int rating = ((Number) row.get("rating")).intValue();
            int n = ((Number) row.get("n")).intValue();
            if (rating >= 1 && rating <= 5) {
                histogram.set(rating - 1, n);
                count += n;
                sum += (long) rating * n;
            }
        }
        BigDecimal avg =
                count == 0
                        ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.valueOf(sum)
                                .divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
        return new ReviewSummaryResource(avg, (int) count, List.copyOf(histogram));
    }

    public void recomputeProductRating(long productId) {
        jdbc.update(RECOMPUTE_PRODUCT_SQL, new MapSqlParameterSource("id", productId));
    }

    public void recomputeFarmerRating(long farmerId) {
        jdbc.update(RECOMPUTE_FARMER_SQL, new MapSqlParameterSource("id", farmerId));
    }

    private static ReviewResource mapReview(ResultSet rs, int rowNum) throws SQLException {
        ReviewTarget target = ReviewTarget.parse(rs.getString("target_type"));
        long targetId =
                target == ReviewTarget.PRODUCT ? rs.getLong("product_id") : rs.getLong("farmer_id");
        ReviewResponseResource response = null;
        long responseId = rs.getLong("response_id");
        if (!rs.wasNull()) {
            response =
                    new ReviewResponseResource(
                            responseId,
                            rs.getString("response_text"),
                            iso(rs.getTimestamp("response_created_at")));
        }
        return new ReviewResource(
                rs.getLong("id"),
                target.value(),
                targetId,
                rs.getString("customer_name"),
                rs.getInt("rating"),
                rs.getString("comment"),
                iso(rs.getTimestamp("created_at")),
                response,
                rs.getString("target_name"));
    }

    private static AdminReviewResource mapAdminReview(ResultSet rs, int rowNum)
            throws SQLException {
        ReviewTarget target = ReviewTarget.parse(rs.getString("target_type"));
        long targetId =
                target == ReviewTarget.PRODUCT ? rs.getLong("product_id") : rs.getLong("farmer_id");
        ReviewResponseResource response = null;
        long responseId = rs.getLong("response_id");
        if (!rs.wasNull()) {
            response =
                    new ReviewResponseResource(
                            responseId,
                            rs.getString("response_text"),
                            iso(rs.getTimestamp("response_created_at")));
        }
        return new AdminReviewResource(
                rs.getLong("id"),
                target.value(),
                targetId,
                rs.getString("target_name"),
                rs.getString("stall_name"),
                rs.getLong("customer_id"),
                rs.getString("customer_name"),
                rs.getInt("rating"),
                rs.getString("comment"),
                rs.getString("status"),
                iso(rs.getTimestamp("created_at")),
                response);
    }

    private static String iso(Timestamp ts) {
        return ts == null ? null : ts.toInstant().toString();
    }
}
