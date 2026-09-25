package com.techx.intervue.modules.achievement.repositories;

import com.techx.intervue.modules.achievement.resources.OrderStats;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Đếm đơn theo kết cục cho một hoặc nhiều người mua, đọc bảng orders đúng theo db/schema.sql. Bảng
 * này chưa có migration (FR-030…038): tới lúc đó câu SQL ném DataAccessException và
 * AchievementService trả available = false. Người không có đơn nào không có mặt trong kết quả.
 */
@Repository
@RequiredArgsConstructor
public class OrderStatsRepository {

    private static final String STATS_BY_CUSTOMER =
            """
            SELECT customer_id, status, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS amount
            FROM orders
            WHERE customer_id IN (:customerIds)
            GROUP BY customer_id, status
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public Map<Long, OrderStats> statsFor(Collection<Long> customerIds) {
        Map<Long, long[]> counts = new HashMap<>();
        if (customerIds.isEmpty()) {
            return Map.of();
        }
        jdbc.query(
                STATS_BY_CUSTOMER,
                new MapSqlParameterSource("customerIds", customerIds),
                rs -> {
                    // [completed, cancelled, declined, inProgress, totalSpent]
                    long[] c = counts.computeIfAbsent(rs.getLong("customer_id"), id -> new long[5]);
                    long orders = rs.getLong("orders");
                    switch (rs.getString("status")) {
                        case "completed" -> {
                            c[0] += orders;
                            c[4] += rs.getBigDecimal("amount").longValue();
                        }
                        case "cancelled" -> c[1] += orders;
                        case "declined" -> c[2] += orders;
                        default -> c[3] += orders;
                    }
                });
        Map<Long, OrderStats> out = new HashMap<>();
        counts.forEach((id, c) -> out.put(id, new OrderStats(c[0], c[1], c[2], c[3], c[4])));
        return out;
    }
}
