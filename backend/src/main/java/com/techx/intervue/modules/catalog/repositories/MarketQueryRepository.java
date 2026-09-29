package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.modules.geo.entities.AddressColumns;
import com.techx.intervue.modules.geo.resources.AddressPartsResource;
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

@Repository
@RequiredArgsConstructor
public class MarketQueryRepository {

    private static final String SELECT_BODY =
            """
            SELECT m.id, m.market_name, m.address,
                   m.country_code, m.province_code, m.ward_code, m.street_name,
                   m.address_line, m.region_name, m.city_name,
                   w.full_name AS ward_name, p.full_name AS province_name,
                   m.latitude, m.longitude, m.map_provider,
                   m.opening_time, m.closing_time,
                   (SELECT GROUP_CONCAT(d.day_of_week ORDER BY d.day_of_week)
                      FROM market_operating_days d WHERE d.market_id = m.id) AS days,
                   (SELECT GROUP_CONCAT(mi.image_url ORDER BY mi.sort_order)
                      FROM market_images mi WHERE mi.market_id = m.id) AS images,
                   (SELECT COUNT(*)
                      FROM farmer_markets fm
                      JOIN farmer_profiles f ON f.id = fm.farmer_id
                     WHERE fm.market_id = m.id
                       AND fm.is_active = TRUE
                       AND f.approval_status = 'approved') AS farmer_count
            FROM markets m
            LEFT JOIN wards w ON w.code = m.ward_code
            LEFT JOIN provinces p ON p.code = m.province_code
            WHERE m.is_active = TRUE
            """;

    private static final String FILTERS =
            """
              AND (:q IS NULL OR m.market_name LIKE :q ESCAPE '!' OR m.address LIKE :q ESCAPE '!')
              AND (:provinceCode IS NULL OR m.province_code = :provinceCode)
              AND (:wardCode IS NULL OR m.ward_code = :wardCode)
              AND (:day IS NULL OR EXISTS (SELECT 1 FROM market_operating_days d
                                            WHERE d.market_id = m.id AND d.day_of_week = :day))
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<MarketResource> search(
            String q, Integer day, String provinceCode, String wardCode, int offset, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("q", q == null || q.isBlank() ? null : "%" + escapeLike(q) + "%")
                        .addValue("day", day)
                        .addValue("provinceCode", provinceCode)
                        .addValue("wardCode", wardCode);

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

    private static String escapeLike(String raw) {
        return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    private static MarketResource map(ResultSet rs) throws SQLException {
        String days = rs.getString("days");
        List<Integer> operatingDays =
                days == null || days.isBlank()
                        ? List.of()
                        : Arrays.stream(days.split(",")).map(Integer::valueOf).toList();
        String images = rs.getString("images");
        List<String> imageUrls =
                images == null || images.isBlank() ? List.of() : Arrays.asList(images.split(","));
        return new MarketResource(
                rs.getLong("id"),
                rs.getString("market_name"),
                rs.getString("address"),
                AddressPartsResource.from(
                        new AddressColumns(
                                rs.getString("country_code"),
                                rs.getString("province_code"),
                                rs.getString("ward_code"),
                                rs.getString("street_name"),
                                rs.getString("address_line"),
                                rs.getString("region_name"),
                                rs.getString("city_name"))),
                rs.getString("ward_name"),
                rs.getString("province_name"),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
                rs.getString("map_provider"),
                hhmm(rs.getString("opening_time")),
                hhmm(rs.getString("closing_time")),
                imageUrls,
                operatingDays,
                rs.getLong("farmer_count"));
    }

    static String hhmm(String time) {
        return time == null ? null : time.substring(0, Math.min(5, time.length()));
    }
}
