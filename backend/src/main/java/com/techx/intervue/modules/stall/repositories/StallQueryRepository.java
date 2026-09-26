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
 * Đọc stall kèm chợ và khung giờ. JdbcTemplate vì gộp 3–4 bảng trong một lượt; mọi giá trị người
 * dùng đi qua tham số (R-04). Module stall không import module catalog — chợ chỉ được chạm tới bằng
 * SQL ở đây.
 */
@Repository
@RequiredArgsConstructor
public class StallQueryRepository {

    /** Bộ lọc dùng chung: chỉ stall đã duyệt (D-09) và đang bán ở chợ đang mở. */
    private static final String WHERE_PUBLIC =
            """
            WHERE f.approval_status = 'approved'
              AND (:q IS NULL OR f.stall_name LIKE :q ESCAPE '!')
              AND (:marketId IS NULL OR fm.market_id = :marketId)
              AND (:day IS NULL OR EXISTS (SELECT 1 FROM farmer_operating_days d
                                            WHERE d.farmer_market_id = fm.id AND d.day_of_week = :day))
            """;

    /**
     * Một dòng mỗi Farmer, kể cả khi bán ở nhiều chợ; khi lọc theo chợ thì quầy và giờ là của chợ
     * đó.
     */
    public static final String SEARCH_STALLS =
            """
            SELECT f.id, f.stall_name, f.logo_url, f.rating_avg, f.rating_count,
                   MIN(fm.stall_code) AS stall_code,
                   MIN(fm.stall_latitude) AS stall_latitude,
                   MIN(fm.stall_longitude) AS stall_longitude,
                   (SELECT GROUP_CONCAT(DISTINCT d.day_of_week ORDER BY d.day_of_week)
                      FROM farmer_operating_days d
                      JOIN farmer_markets fm2 ON fm2.id = d.farmer_market_id AND fm2.is_active = TRUE
                     WHERE fm2.farmer_id = f.id
                       AND (:marketId IS NULL OR fm2.market_id = :marketId)) AS days
            FROM farmer_profiles f
            JOIN farmer_markets fm ON fm.farmer_id = f.id AND fm.is_active = TRUE
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            """
                    + WHERE_PUBLIC
                    + """
            GROUP BY f.id, f.stall_name, f.logo_url, f.rating_avg, f.rating_count
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
     * Các chợ của một stall kèm khung giờ từng ngày (cho trang stall công khai và hồ sơ của chính
     * Farmer).
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
     * Chợ có tồn tại và đang mở? Kiểm bằng SQL để module stall không phải import module catalog.
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
                rs.getString("logo_url"),
                rs.getString("stall_code"),
                rs.getBigDecimal("stall_latitude"),
                rs.getBigDecimal("stall_longitude"),
                rs.getBigDecimal("rating_avg"),
                rs.getInt("rating_count"),
                operatingDays);
    }

    /** '%' và '_' người dùng gõ không được thành ký tự đại diện. */
    private static String escapeLike(String raw) {
        return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    /** TIME đọc ra là "07:00:00"; contract trả "07:00". */
    static String hhmm(String time) {
        return time == null ? null : time.substring(0, Math.min(5, time.length()));
    }
}
