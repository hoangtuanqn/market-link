package com.techx.intervue.modules.user.repositories;

import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * FR-072: customer accounts with their order count, for the admin. Role is fixed to {@code
 * customer} in the SQL — stalls are managed on {@code /admin/farmers}. The search text goes in as a
 * LIKE parameter with {@code !} escaping (R-04).
 */
@Repository
@RequiredArgsConstructor
public class AdminCustomerQueryRepository {

    private static final String COLUMNS =
            """
            SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at,
                   (SELECT COUNT(*) FROM orders o WHERE o.customer_id = u.id) AS order_count
            FROM users u
            WHERE u.role = 'customer'
            """;

    private static final String LIST_WHERE =
            """
              AND (:status IS NULL OR u.status = :status)
              AND (:q IS NULL OR LOWER(u.full_name) LIKE :q ESCAPE '!'
                   OR LOWER(u.email) LIKE :q ESCAPE '!' OR u.phone LIKE :q ESCAPE '!')
            """;

    public static final String LIST_SQL =
            COLUMNS
                    + LIST_WHERE
                    + "ORDER BY u.created_at DESC, u.id DESC\nLIMIT :limit OFFSET :offset";

    private static final String COUNT_SQL =
            "SELECT COUNT(*) FROM users u WHERE u.role = 'customer'" + LIST_WHERE;

    public static final String ONE_SQL = COLUMNS + "  AND u.id = :id";

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<AdminCustomerResource> search(
            String status, String query, int page, int pageSize) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("status", status, Types.VARCHAR)
                        .addValue("q", likePattern(query), Types.VARCHAR)
                        .addValue("limit", pageSize)
                        .addValue("offset", (page - 1) * pageSize);
        List<AdminCustomerResource> items =
                jdbc.query(LIST_SQL, params, AdminCustomerQueryRepository::map);
        Long total = jdbc.queryForObject(COUNT_SQL, params, Long.class);
        return new PageResource<>(items, page, pageSize, total == null ? 0 : total);
    }

    public Optional<AdminCustomerResource> findOne(long userId) {
        return jdbc
                .query(
                        ONE_SQL,
                        new MapSqlParameterSource("id", userId),
                        AdminCustomerQueryRepository::map)
                .stream()
                .findFirst();
    }

    static String likePattern(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        String escaped =
                query.trim()
                        .toLowerCase(Locale.ROOT)
                        .replace("!", "!!")
                        .replace("%", "!%")
                        .replace("_", "!_");
        return "%" + escaped + "%";
    }

    private static AdminCustomerResource map(ResultSet rs, int rowNum) throws SQLException {
        return new AdminCustomerResource(
                rs.getLong("id"),
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("phone"),
                rs.getString("status"),
                rs.getLong("order_count"),
                rs.getTimestamp("created_at").toInstant().toString());
    }
}
