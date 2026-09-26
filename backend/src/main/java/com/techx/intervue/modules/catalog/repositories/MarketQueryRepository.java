package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Đọc chợ kèm ngày họp và số stall đang bán. Dùng JdbcTemplate vì phải gộp ba bảng trong một lượt;
 * mọi giá trị người dùng đi qua tham số, không nối chuỗi (R-04).
 */
@Repository
@RequiredArgsConstructor
public class MarketQueryRepository {

    private static final String SELECT_BODY =
            """
            SELECT m.id, m.market_name, m.address, m.district, m.city,
                   m.latitude, m.longitude, m.map_provider,
                   m.opening_time, m.closing_time, m.image_url,
                   (SELECT GROUP_CONCAT(d.day_of_week ORDER BY d.day_of_week)
                      FROM market_operating_days d WHERE d.market_id = m.id) AS days,
                   (SELECT COUNT(*)
                      FROM farmer_markets fm
                      JOIN farmer_profiles f ON f.id = fm.farmer_id
                     WHERE fm.market_id = m.id
                       AND fm.is_active = TRUE
                       AND f.approval_status = 'approved') AS farmer_count
            FROM markets m
            WHERE m.is_active = TRUE
            """;

    private static final String FILTERS =
            """
              AND (:q IS NULL OR m.market_name LIKE :q ESCAPE '!' OR m.address LIKE :q ESCAPE '!')
              AND (:city IS NULL OR m.city = :city)
              AND (:district IS NULL OR m.district = :district)
              AND (:day IS NULL OR EXISTS (SELECT 1 FROM market_operating_days d
                                            WHERE d.market_id = m.id AND d.day_of_week = :day))
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<MarketResource> search(
            String q, Integer day, String city, String district, int offset, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("q", q == null || q.isBlank() ? null : "%" + escapeLike(q) + "%")
                        .addValue("day", day)
                        .addValue("city", city)
                        .addValue("district", district);

        Long total =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM markets m WHERE m.is_active = TRUE " + FILTERS,
                        params,
                        Long.class);

        params.addValue("limit", limit).addValue("offset", offset);
        List<MarketResource> items =
                jdbc.query(
                        SELECT_BODY
                                + FILTERS
                                + " ORDER BY m.market_name LIMIT :limit OFFSET :offset",
                        params,
                        (rs, i) -> map(rs));

        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    public Optional<MarketResource> findById(long id) {
        List<MarketResource> rows =
                jdbc.query(
                        SELECT_BODY + " AND m.id = :id",
                        new MapSqlParameterSource("id", id),
                        (rs, i) -> map(rs));
        return rows.stream().findFirst();
    }

    /** '%' và '_' người dùng gõ vào ô tìm kiếm không được thành ký tự đại diện. */
    private static String escapeLike(String raw) {
        return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    private static MarketResource map(ResultSet rs) throws SQLException {
        String days = rs.getString("days");
        List<Integer> operatingDays =
                days == null || days.isBlank()
                        ? List.of()
                        : Arrays.stream(days.split(",")).map(Integer::valueOf).toList();
        return new MarketResource(
                rs.getLong("id"),
                rs.getString("market_name"),
                rs.getString("address"),
                rs.getString("district"),
                rs.getString("city"),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
                rs.getString("map_provider"),
                hhmm(rs.getString("opening_time")),
                hhmm(rs.getString("closing_time")),
                rs.getString("image_url"),
                operatingDays,
                rs.getLong("farmer_count"));
    }

    /** TIME đọc ra là "05:00:00"; contract trả "05:00". */
    static String hhmm(String time) {
        return time == null ? null : time.substring(0, Math.min(5, time.length()));
    }
}
