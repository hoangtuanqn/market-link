package com.techx.intervue.modules.farmer.repositories;

import com.techx.intervue.modules.farmer.resources.AdminFarmerStatusHistoryResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** FR-071: the suspend/reinstate audit trail for one stall, newest first. */
@Repository
@RequiredArgsConstructor
public class AdminFarmerStatusHistoryQueryRepository {

    private static final String LIST_SQL =
            """
            SELECT h.id, h.from_status, h.to_status, h.reason, h.until, h.changed_at, a.full_name AS changed_by_name
            FROM farmer_status_history h
            LEFT JOIN users a ON a.id = h.changed_by
            WHERE h.farmer_id = :farmerId
            ORDER BY h.changed_at DESC, h.id DESC
            LIMIT :limit OFFSET :offset
            """;

    private static final String COUNT_SQL =
            "SELECT COUNT(*) FROM farmer_status_history WHERE farmer_id = :farmerId";

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<AdminFarmerStatusHistoryResource> search(
            long farmerId, int page, int pageSize) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<AdminFarmerStatusHistoryResource> items =
                jdbc.query(LIST_SQL, params, AdminFarmerStatusHistoryQueryRepository::map);
        Long total =
                jdbc.queryForObject(
                        COUNT_SQL, new MapSqlParameterSource("farmerId", farmerId), Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }

    private static AdminFarmerStatusHistoryResource map(ResultSet rs, int rowNum)
            throws SQLException {
        Timestamp until = rs.getTimestamp("until");
        return new AdminFarmerStatusHistoryResource(
                rs.getLong("id"),
                rs.getString("from_status"),
                rs.getString("to_status"),
                rs.getString("reason"),
                until == null ? null : until.toInstant().toString(),
                rs.getString("changed_by_name"),
                rs.getTimestamp("changed_at").toInstant().toString());
    }
}
