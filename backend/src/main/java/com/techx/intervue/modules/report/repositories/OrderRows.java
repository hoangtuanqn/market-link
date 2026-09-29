package com.techx.intervue.modules.report.repositories;

import com.techx.intervue.modules.order.resources.OrderListItemResource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderRows {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    public static final String LIST_COLUMNS =
            """
            SELECT o.id, o.order_code, o.status, o.farmer_id, f.stall_name, o.market_id, m.market_name,
                   o.pickup_date, o.pickup_start, o.pickup_end, o.cutoff_at, o.total_amount, o.created_at,
                   (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                   o.customer_id, cu.full_name AS customer_name,
                   EXISTS(SELECT 1 FROM reviews r WHERE r.order_id = o.id) AS reviewed
            """;

    public static final String LIST_FROM =
            """
            FROM orders o
            JOIN farmer_profiles f ON f.id = o.farmer_id
            JOIN markets m ON m.id = o.market_id
            JOIN users cu ON cu.id = o.customer_id
            """;

    public static final String RANGE_FILTER =
            """
              AND (:from IS NULL OR o.pickup_date >= :from)
              AND (:to IS NULL OR o.pickup_date <= :to)
            """;

    private final Clock clock;

    public OrderListItemResource map(ResultSet rs, int rowNum) throws SQLException {
        return new OrderListItemResource(
                rs.getLong("id"),
                rs.getString("order_code"),
                rs.getString("status"),
                rs.getLong("farmer_id"),
                rs.getString("stall_name"),
                rs.getLong("market_id"),
                rs.getString("market_name"),
                rs.getObject("pickup_date", LocalDate.class).toString(),
                rs.getTime("pickup_start").toLocalTime().format(HH_MM),
                rs.getTime("pickup_end").toLocalTime().format(HH_MM),
                rs.getObject("cutoff_at", LocalDateTime.class)
                        .atZone(clock.getZone())
                        .toInstant()
                        .toString(),
                rs.getBigDecimal("total_amount"),
                rs.getInt("item_count"),
                rs.getTimestamp("created_at").toInstant().toString(),
                rs.getLong("customer_id"),
                rs.getString("customer_name"),
                rs.getBoolean("reviewed"));
    }

    public static String statusOrNull(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        List<String> known =
                List.of("placed", "accepted", "declined", "ready", "completed", "cancelled");
        String s = status.trim().toLowerCase(Locale.ROOT);
        if (!known.contains(s)) {
            throw new IllegalArgumentException("Unknown order status.");
        }
        return s;
    }
}
