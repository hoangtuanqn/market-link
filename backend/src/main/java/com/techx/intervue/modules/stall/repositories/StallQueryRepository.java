package com.techx.intervue.modules.stall.repositories;

import com.techx.intervue.modules.stall.resources.OperatingDayResource;
import com.techx.intervue.modules.stall.resources.StallMarketResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import com.techx.intervue.resources.PageResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads stalls with their market and time windows. JdbcTemplate because it joins 3–4 tables in one
 * pass; every user value goes through parameters (R-04). The stall module does not import the
 * catalog module — a market is only touched by SQL here.
 */
@Repository
@RequiredArgsConstructor
public class StallQueryRepository {

    /** The shared filter: only approved stalls (D-09) and selling at an open market. */
    private static final String WHERE_PUBLIC =
            """
            WHERE f.approval_status = 'approved'
              AND (:q IS NULL OR f.stall_name LIKE :q ESCAPE '!')
              AND (:marketId IS NULL OR fm.market_id = :marketId)
              AND (:day IS NULL OR EXISTS (SELECT 1 FROM farmer_operating_days d
                                            WHERE d.farmer_market_id = fm.id AND d.day_of_week = :day))
            """;

    /**
     * One row per Farmer, even when they sell at several markets; when filtering by market the
     * booth and hours are those of that market.
     */
    public static final String SEARCH_STALLS =
            """
            SELECT f.id, f.stall_name, f.contact_person, f.logo_url, f.rating_avg, f.rating_count,
                   MIN(fm.stall_code) AS stall_code,
                   MIN(fm.stall_latitude) AS stall_latitude,
                   MIN(fm.stall_longitude) AS stall_longitude,
                   (SELECT GROUP_CONCAT(DISTINCT d.day_of_week ORDER BY d.day_of_week)
                      FROM farmer_operating_days d
                      JOIN farmer_markets fm2 ON fm2.id = d.farmer_market_id AND fm2.is_active = TRUE
                     WHERE fm2.farmer_id = f.id
                       AND (:marketId IS NULL OR fm2.market_id = :marketId)) AS days,
                   (SELECT MIN(d.pickup_start_time)
                      FROM farmer_operating_days d
                      JOIN farmer_markets fm2 ON fm2.id = d.farmer_market_id AND fm2.is_active = TRUE
                     WHERE fm2.farmer_id = f.id
                       AND (:marketId IS NULL OR fm2.market_id = :marketId)) AS pickup_start,
                   (SELECT MAX(d.pickup_end_time)
                      FROM farmer_operating_days d
                      JOIN farmer_markets fm2 ON fm2.id = d.farmer_market_id AND fm2.is_active = TRUE
                     WHERE fm2.farmer_id = f.id
                       AND (:marketId IS NULL OR fm2.market_id = :marketId)) AS pickup_end
            FROM farmer_profiles f
            JOIN farmer_markets fm ON fm.farmer_id = f.id AND fm.is_active = TRUE
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            """
                    + WHERE_PUBLIC
                    + """
            GROUP BY f.id, f.stall_name, f.contact_person, f.logo_url, f.rating_avg, f.rating_count
            ORDER BY f.rating_avg DESC, f.stall_name
            LIMIT :limit OFFSET :offset
            """;

    private static final String COUNT_STALLS =
            """
            SELECT COUNT(DISTINCT f.id)
            FROM farmer_profiles f
            JOIN farmer_markets fm ON fm.farmer_id = f.id AND fm.is_active = TRUE
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            """
                    + WHERE_PUBLIC;

    /**
     * A stall's markets with the time windows for each day (for the public stall page and the
     * Farmer's own profile).
     */
    private static final String STALL_MARKETS =
            """
            SELECT fm.id AS farmer_market_id, m.id AS market_id, m.market_name,
                   fm.stall_code, fm.stall_latitude, fm.stall_longitude,
                   d.day_of_week, d.pickup_start_time, d.pickup_end_time
            FROM farmer_markets fm
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            LEFT JOIN farmer_operating_days d ON d.farmer_market_id = fm.id
            WHERE fm.is_active = TRUE
              AND (:farmerId IS NULL OR fm.farmer_id = :farmerId)
              AND (:farmerMarketId IS NULL OR fm.id = :farmerMarketId)
            ORDER BY m.market_name, fm.id, d.day_of_week
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public PageResource<StallSummaryResource> search(
            String q, Long marketId, Integer day, int offset, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("q", q == null || q.isBlank() ? null : "%" + escapeLike(q) + "%")
                        .addValue("marketId", marketId)
                        .addValue("day", day);
        Long total = jdbc.queryForObject(COUNT_STALLS, params, Long.class);
        params.addValue("limit", limit).addValue("offset", offset);
        List<StallSummaryResource> items =
                jdbc.query(SEARCH_STALLS, params, (rs, i) -> summary(rs));
        return new PageResource<>(items, offset / limit + 1, limit, total == null ? 0 : total);
    }

    public List<StallMarketResource> marketsOf(long farmerId) {
        return stallMarkets(farmerId, null);
    }

    public Optional<StallMarketResource> stallMarket(long farmerMarketId) {
        return stallMarkets(null, farmerMarketId).stream().findFirst();
    }

    /**
     * Does the market exist and is it open? Checked with SQL so the stall module does not have to
     * import the catalog module.
     */
    public boolean marketExists(long marketId) {
        Integer n =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM markets WHERE id = :id AND is_active = TRUE",
                        new MapSqlParameterSource("id", marketId),
                        Integer.class);
        return n != null && n > 0;
    }

    private List<StallMarketResource> stallMarkets(Long farmerId, Long farmerMarketId) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("farmerMarketId", farmerMarketId);
        return jdbc.query(
                STALL_MARKETS,
                params,
                rs -> {
                    Map<Long, StallMarketResource> byId = new LinkedHashMap<>();
                    Map<Long, List<OperatingDayResource>> days = new LinkedHashMap<>();
                    while (rs.next()) {
                        long id = rs.getLong("farmer_market_id");
                        days.computeIfAbsent(id, k -> new ArrayList<>());
                        if (!byId.containsKey(id)) {
                            byId.put(
                                    id,
                                    new StallMarketResource(
                                            id,
                                            rs.getLong("market_id"),
                                            rs.getString("market_name"),
                                            rs.getString("stall_code"),
                                            rs.getBigDecimal("stall_latitude"),
                                            rs.getBigDecimal("stall_longitude"),
                                            days.get(id)));
                        }
                        String start = rs.getString("pickup_start_time");
                        if (start != null) {
                            days.get(id)
                                    .add(
                                            new OperatingDayResource(
                                                    rs.getInt("day_of_week"),
                                                    hhmm(start),
                                                    hhmm(rs.getString("pickup_end_time"))));
                        }
                    }
                    return new ArrayList<>(byId.values());
                });
    }

    private static StallSummaryResource summary(ResultSet rs) throws SQLException {
        String days = rs.getString("days");
        List<Integer> operatingDays =
                days == null || days.isBlank()
                        ? List.of()
                        : Arrays.stream(days.split(",")).map(Integer::valueOf).toList();
        return new StallSummaryResource(
                rs.getLong("id"),
                rs.getString("stall_name"),
                rs.getString("contact_person"),
                rs.getString("logo_url"),
                rs.getString("stall_code"),
                rs.getBigDecimal("stall_latitude"),
                rs.getBigDecimal("stall_longitude"),
                rs.getBigDecimal("rating_avg"),
                rs.getInt("rating_count"),
                operatingDays,
                hhmm(rs.getString("pickup_start")),
                hhmm(rs.getString("pickup_end")));
    }

    /** '%' and '_' typed by the user must not act as wildcards. */
    private static String escapeLike(String raw) {
        return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    /** A TIME column reads as "07:00:00"; the contract returns "07:00". */
    static String hhmm(String time) {
        return time == null ? null : time.substring(0, Math.min(5, time.length()));
    }
}
