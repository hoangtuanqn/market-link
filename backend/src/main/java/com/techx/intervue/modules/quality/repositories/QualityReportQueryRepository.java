package com.techx.intervue.modules.quality.repositories;

import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class QualityReportQueryRepository {

    static final String COLUMNS =
            """
            SELECT qr.id, qr.order_id, o.order_code, qr.farmer_id, f.stall_name,
                   f.approval_status, cu.full_name AS customer_name, qr.product_id,
                   oi.product_name, o.pickup_date, oi.best_before, oi.storage_mode,
                   qr.spoiled_on, qr.before_promise, qr.problem, qr.note, qr.photo_url,
                   qr.shelf_life_extended, qr.extended_by_days, qr.status, qr.farmer_response,
                   qr.farmer_responded_at, qr.decision_note, qr.decided_at, qr.created_at,
                   (SELECT COUNT(*) FROM farmer_violations v
                     WHERE v.farmer_id = qr.farmer_id AND v.created_at > :since) AS active_strikes
            FROM quality_reports qr
            JOIN orders o ON o.id = qr.order_id
            JOIN order_items oi ON oi.id = qr.order_item_id
            JOIN farmer_profiles f ON f.id = qr.farmer_id
            JOIN users cu ON cu.id = qr.customer_id
            """;

    static final String STALL_FILTER = "WHERE qr.farmer_id = :farmerId\n";

    static final String ADMIN_FILTER =
            """
            WHERE (:status IS NULL OR qr.status = :status)
              AND (:decided = FALSE OR qr.status <> 'open')
              AND (:escalated IS NULL
                   OR (qr.shelf_life_extended = TRUE AND qr.before_promise = TRUE) = :escalated)
            """;

    static final String NEWEST_FIRST =
            "ORDER BY qr.created_at DESC, qr.id DESC\nLIMIT :limit OFFSET :offset";

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<QualityReportResource> forStall(
            long farmerId, Instant since, int offset, int limit) {
        return page(
                STALL_FILTER,
                new MapSqlParameterSource("farmerId", farmerId),
                since,
                offset,
                limit);
    }

    public PageResource<QualityReportResource> forAdmin(
            String status,
            boolean decided,
            Boolean escalated,
            Instant since,
            int offset,
            int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("status", status)
                        .addValue("decided", decided)
                        .addValue("escalated", escalated);
        return page(ADMIN_FILTER, params, since, offset, limit);
    }

    public Optional<QualityReportResource> findById(long reportId, Instant since) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("id", reportId)
                        .addValue("since", Timestamp.from(since));
        return jdbc.query(COLUMNS + "WHERE qr.id = :id", params, (rs, i) -> row(rs)).stream()
                .findFirst();
    }

    private PageResource<QualityReportResource> page(
            String filter, MapSqlParameterSource params, Instant since, int offset, int limit) {
        Long total =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM quality_reports qr " + filter, params, Long.class);
        params.addValue("since", Timestamp.from(since))
                .addValue("limit", limit)
                .addValue("offset", offset);
        List<QualityReportResource> items =
                jdbc.query(COLUMNS + filter + NEWEST_FIRST, params, (rs, i) -> row(rs));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    private static QualityReportResource row(ResultSet rs) throws SQLException {
        LocalDate bestBefore = rs.getObject("best_before", LocalDate.class);
        return new QualityReportResource(
                rs.getLong("id"),
                rs.getLong("order_id"),
                rs.getString("order_code"),
                rs.getLong("farmer_id"),
                rs.getString("stall_name"),
                rs.getString("approval_status"),
                rs.getString("customer_name"),
                rs.getLong("product_id"),
                rs.getString("product_name"),
                rs.getObject("pickup_date", LocalDate.class).toString(),
                bestBefore == null ? null : bestBefore.toString(),
                rs.getString("storage_mode"),
                rs.getObject("spoiled_on", LocalDate.class).toString(),
                rs.getBoolean("before_promise"),
                rs.getString("problem"),
                rs.getString("note"),
                rs.getString("photo_url"),
                rs.getBoolean("shelf_life_extended"),
                rs.getInt("extended_by_days"),
                rs.getString("status"),
                rs.getString("farmer_response"),
                instant(rs, "farmer_responded_at"),
                rs.getString("decision_note"),
                instant(rs, "decided_at"),
                instant(rs, "created_at"),
                rs.getInt("active_strikes"));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp ts = rs.getTimestamp(column);
        return ts == null ? null : ts.toInstant();
    }
}
