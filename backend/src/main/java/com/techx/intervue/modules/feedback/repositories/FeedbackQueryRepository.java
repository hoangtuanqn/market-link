package com.techx.intervue.modules.feedback.repositories;

import com.techx.intervue.modules.feedback.resources.FeedbackResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Admin reads of the feedback queue, with the sender joined in when there is one (R-04). */
@Repository
@RequiredArgsConstructor
public class FeedbackQueryRepository {

    private static final String COLUMNS =
            """
            SELECT f.id, f.type, f.message, f.status, f.created_at,
                   f.user_id, u.full_name AS user_name, u.email AS user_email
            FROM feedbacks f
            LEFT JOIN users u ON u.id = f.user_id
            """;

    private static final String LIST_WHERE = "WHERE (:status IS NULL OR f.status = :status)\n";

    /** {@code GET /admin/feedbacks}: newest first. */
    public static final String LIST_SQL =
            COLUMNS
                    + LIST_WHERE
                    + "ORDER BY f.created_at DESC, f.id DESC\nLIMIT :limit OFFSET :offset";

    private static final String COUNT_SQL = "SELECT COUNT(*) FROM feedbacks f " + LIST_WHERE;

    public static final String ONE_SQL = COLUMNS + "WHERE f.id = :id";

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<FeedbackResource> list(String status, int page, int pageSize) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("status", status, Types.VARCHAR)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<FeedbackResource> items = jdbc.query(LIST_SQL, params, FeedbackQueryRepository::map);
        Long total = jdbc.queryForObject(COUNT_SQL, params, Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }

    public Optional<FeedbackResource> findOne(long id) {
        return jdbc
                .query(ONE_SQL, new MapSqlParameterSource("id", id), FeedbackQueryRepository::map)
                .stream()
                .findFirst();
    }

    private static FeedbackResource map(ResultSet rs, int rowNum) throws SQLException {
        long userId = rs.getLong("user_id");
        boolean anonymous = rs.wasNull();
        return new FeedbackResource(
                rs.getLong("id"),
                rs.getString("type"),
                rs.getString("message"),
                rs.getString("status"),
                anonymous ? null : userId,
                rs.getString("user_name"),
                rs.getString("user_email"),
                rs.getTimestamp("created_at").toInstant().toString());
    }
}
