package com.techx.intervue.modules.chat.repositories;

import com.techx.intervue.modules.chat.resources.AdminRows.AccountRow;
import com.techx.intervue.modules.chat.resources.AdminRows.FlaggedReviewRow;
import com.techx.intervue.modules.chat.resources.AdminRows.HiddenItemRow;
import com.techx.intervue.modules.chat.resources.AdminRows.MarketActivityRow;
import com.techx.intervue.modules.chat.resources.AdminRows.PendingFarmerRow;
import com.techx.intervue.modules.chat.resources.AdminRows.PlatformTotalsRow;
import java.math.BigDecimal;
import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * FR-094: the fixed SQL the Admin assistant may run. Read-only, every user value a parameter
 * (R-04). An admin legitimately sees the whole platform, so there is no owner filter here — the
 * boundary is the role itself, checked before the tool list is even built.
 */
@Repository
@RequiredArgsConstructor
public class AdminKnowledgeRepository {

    private static final int ROW_LIMIT = 20;

    private static final String PLATFORM_TOTALS =
            """
            SELECT
              (SELECT COUNT(*) FROM farmer_profiles WHERE approval_status = 'approved') AS farmers,
              (SELECT COUNT(*) FROM farmer_profiles WHERE approval_status = 'pending')  AS pending_farmers,
              (SELECT COUNT(*) FROM users WHERE role = 'customer')                      AS customers,
              (SELECT COUNT(*) FROM markets WHERE is_active = TRUE)                     AS markets,
              (SELECT COUNT(*) FROM orders
                 WHERE pickup_date BETWEEN :fromDate AND :toDate)                       AS orders,
              (SELECT COALESCE(SUM(total_amount), 0) FROM orders
                 WHERE status = 'completed'
                   AND pickup_date BETWEEN :fromDate AND :toDate)                       AS revenue
            """;

    private static final String MARKET_ACTIVITY =
            """
            SELECT m.market_name,
                   COUNT(o.id) AS order_count,
                   COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0)
                       AS revenue,
                   COUNT(DISTINCT o.farmer_id) AS active_stalls
            FROM markets m
            LEFT JOIN orders o
                   ON o.market_id = m.id
                  AND o.pickup_date BETWEEN :fromDate AND :toDate
            WHERE m.is_active = TRUE
            GROUP BY m.id, m.market_name
            ORDER BY order_count DESC, m.market_name
            LIMIT :limit
            """;

    private static final String PENDING_FARMERS =
            """
            SELECT f.id AS farmer_id, f.stall_name, f.contact_person, u.email,
                   DATE(f.created_at) AS applied_on, f.approval_status
            FROM farmer_profiles f
            JOIN users u ON u.id = f.user_id
            WHERE (:status IS NULL OR f.approval_status = :status)
            ORDER BY f.created_at
            LIMIT :limit
            """;

    private static final String SEARCH_USERS =
            """
            SELECT id AS user_id, full_name, email, role, status, DATE(created_at) AS joined_on
            FROM users
            WHERE (:role IS NULL OR role = :role)
              AND (:status IS NULL OR status = :status)
              AND (:keyword IS NULL
                   OR full_name LIKE :keyword ESCAPE '!'
                   OR email LIKE :keyword ESCAPE '!')
            ORDER BY created_at DESC
            LIMIT :limit
            """;

    /** FR-074 queue: visible reviews a moderator would want to look at first. */
    private static final String FLAGGED_REVIEWS =
            """
            SELECT r.id AS review_id, r.rating, r.comment, f.stall_name,
                   COALESCE(p.name, f.stall_name) AS target_name, DATE(r.created_at) AS created_on
            FROM reviews r
            JOIN orders o          ON o.id = r.order_id
            JOIN farmer_profiles f ON f.id = o.farmer_id
            LEFT JOIN products p   ON p.id = r.product_id
            WHERE r.status = 'visible'
              AND r.rating <= :maxRating
            ORDER BY r.created_at DESC
            LIMIT :limit
            """;

    private static final String HIDDEN_ITEMS =
            """
            SELECT 'product' AS kind, id, name, hidden_reason AS reason
            FROM products
            WHERE is_hidden = TRUE AND is_deleted = FALSE
            ORDER BY updated_at DESC
            LIMIT :limit
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public PlatformTotalsRow platformTotals(LocalDate from, LocalDate to) {
        PlatformTotalsRow row =
                jdbc.queryForObject(
                        PLATFORM_TOTALS,
                        range(from, to),
                        (rs, i) ->
                                new PlatformTotalsRow(
                                        rs.getLong("farmers"),
                                        rs.getLong("pending_farmers"),
                                        rs.getLong("customers"),
                                        rs.getLong("markets"),
                                        rs.getLong("orders"),
                                        rs.getBigDecimal("revenue")));
        return row == null ? new PlatformTotalsRow(0, 0, 0, 0, 0, BigDecimal.ZERO) : row;
    }

    public List<MarketActivityRow> marketActivity(LocalDate from, LocalDate to) {
        return jdbc.query(
                MARKET_ACTIVITY,
                range(from, to).addValue("limit", ROW_LIMIT),
                (rs, i) ->
                        new MarketActivityRow(
                                rs.getString("market_name"),
                                rs.getLong("order_count"),
                                rs.getBigDecimal("revenue"),
                                rs.getLong("active_stalls")));
    }

    public List<PendingFarmerRow> farmerApplications(String status) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("status", status, Types.VARCHAR)
                        .addValue("limit", ROW_LIMIT);
        return jdbc.query(
                PENDING_FARMERS,
                params,
                (rs, i) ->
                        new PendingFarmerRow(
                                rs.getLong("farmer_id"),
                                rs.getString("stall_name"),
                                rs.getString("contact_person"),
                                rs.getString("email"),
                                rs.getObject("applied_on", LocalDate.class),
                                rs.getString("approval_status")));
    }

    public List<AccountRow> searchUsers(String role, String status, String keyword) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("role", role, Types.VARCHAR)
                        .addValue("status", status, Types.VARCHAR)
                        .addValue(
                                "keyword",
                                keyword == null
                                        ? null
                                        : "%" + ChatKnowledgeRepository.escapeLike(keyword) + "%",
                                Types.VARCHAR)
                        .addValue("limit", ROW_LIMIT);
        return jdbc.query(
                SEARCH_USERS,
                params,
                (rs, i) ->
                        new AccountRow(
                                rs.getLong("user_id"),
                                rs.getString("full_name"),
                                rs.getString("email"),
                                rs.getString("role"),
                                rs.getString("status"),
                                rs.getObject("joined_on", LocalDate.class)));
    }

    public List<FlaggedReviewRow> flaggedReviews(int maxRating) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("maxRating", maxRating)
                        .addValue("limit", ROW_LIMIT);
        return jdbc.query(
                FLAGGED_REVIEWS,
                params,
                (rs, i) ->
                        new FlaggedReviewRow(
                                rs.getLong("review_id"),
                                rs.getInt("rating"),
                                rs.getString("comment"),
                                rs.getString("stall_name"),
                                rs.getString("target_name"),
                                rs.getObject("created_on", LocalDate.class)));
    }

    public List<HiddenItemRow> hiddenItems() {
        return jdbc.query(
                HIDDEN_ITEMS,
                new MapSqlParameterSource("limit", ROW_LIMIT),
                (rs, i) ->
                        new HiddenItemRow(
                                rs.getString("kind"),
                                rs.getLong("id"),
                                rs.getString("name"),
                                rs.getString("reason")));
    }

    private static MapSqlParameterSource range(LocalDate from, LocalDate to) {
        return new MapSqlParameterSource().addValue("fromDate", from).addValue("toDate", to);
    }
}
