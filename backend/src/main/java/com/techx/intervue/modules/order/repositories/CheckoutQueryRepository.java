package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource.MarketOption;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Đọc phục vụ giỏ hàng. Module order không import module catalog — chợ chỉ được chạm tới bằng SQL ở
 * đây, như StallQueryRepository; mọi giá trị đi qua tham số (R-04).
 */
@Repository
@RequiredArgsConstructor
public class CheckoutQueryRepository {

    /** C5-11: các chợ stall đang bán — liên kết còn bật và chợ còn mở. */
    public static final String STALL_MARKETS =
            """
            SELECT fm.farmer_id, m.id AS market_id, m.market_name
            FROM farmer_markets fm
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            WHERE fm.is_active = TRUE
              AND fm.farmer_id IN (:farmerIds)
            ORDER BY fm.farmer_id, m.market_name, m.id
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public Map<Long, List<MarketOption>> marketsOf(Collection<Long> farmerIds) {
        if (farmerIds.isEmpty()) {
            return Map.of();
        }
        List<Row> rows =
                jdbc.query(
                        STALL_MARKETS,
                        new MapSqlParameterSource("farmerIds", farmerIds),
                        (rs, i) ->
                                new Row(
                                        rs.getLong("farmer_id"),
                                        new MarketOption(
                                                rs.getLong("market_id"),
                                                rs.getString("market_name"))));
        return rows.stream()
                .collect(
                        Collectors.groupingBy(
                                Row::farmerId,
                                LinkedHashMap::new,
                                Collectors.mapping(Row::market, Collectors.toList())));
    }

    private record Row(long farmerId, MarketOption market) {}
}
