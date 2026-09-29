package com.techx.intervue.modules.quality;

import com.techx.intervue.modules.report.services.impl.ReportFixture;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * Rows for the spoilage tests on the real MySQL database, on top of {@link ReportFixture}: order
 * lines with a shelf-life promise, reports, strikes and a storage group. Meant for
 * {@code @Transactional} tests, which roll every row back.
 */
public final class QualityFixture {

    public final ReportFixture base;
    private final JdbcTemplate jdbc;

    public QualityFixture(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.base = new ReportFixture(jdbc);
    }

    /**
     * One order line kept in the fridge and good until {@code bestBefore}: 5 days against a
     * suggestion of 3 when extended, else the suggested 3 days.
     */
    public long line(long orderId, long productId, LocalDate bestBefore, boolean extended) {
        base.item(orderId, productId, 1, 1);
        jdbc.update(
                "UPDATE order_items SET shelf_life_days = ?, storage_mode = 'chilled',"
                        + " best_before = ?, shelf_life_extended = ?, extended_by_days = ?"
                        + " WHERE order_id = ? AND product_id = ?",
                extended ? 5 : 3,
                bestBefore,
                extended,
                extended ? 2 : 0,
                orderId,
                productId);
        return jdbc.queryForObject(
                "SELECT id FROM order_items WHERE order_id = ? AND product_id = ?",
                Long.class,
                orderId,
                productId);
    }

    /**
     * A report on one line that copies the line's promise; {@code status} is open, confirmed or
     * dismissed (a decided one gets a decision time), made {@code minutesAgo}.
     */
    public long report(long itemId, String status, boolean beforePromise, int minutesAgo) {
        return insert(
                "INSERT INTO quality_reports (order_item_id, order_id, customer_id, farmer_id,"
                        + " product_id, spoiled_on, problem, before_promise, shelf_life_extended,"
                        + " extended_by_days, status, decided_at, created_at)"
                        + " SELECT oi.id, o.id, o.customer_id, o.farmer_id, oi.product_id,"
                        + " o.pickup_date, 'mold', ?, oi.shelf_life_extended, oi.extended_by_days,"
                        + " ?, IF(? = 'open', NULL, NOW()), NOW() - INTERVAL ? MINUTE"
                        + " FROM order_items oi JOIN orders o ON o.id = oi.order_id"
                        + " WHERE oi.id = ?",
                beforePromise,
                status,
                status,
                minutesAgo,
                itemId);
    }

    /** A strike recorded {@code daysAgo} for the stall and the product of {@code reportId}. */
    public long strike(long reportId, long adminUserId, int daysAgo) {
        return insert(
                "INSERT INTO farmer_violations (farmer_id, quality_report_id, product_id,"
                        + " extended_by_days, created_by, created_at)"
                        + " SELECT r.farmer_id, r.id, r.product_id, r.extended_by_days, ?,"
                        + " NOW() - INTERVAL ? DAY FROM quality_reports r WHERE r.id = ?",
                adminUserId,
                daysAgo,
                reportId);
    }

    /**
     * The product as the stall saved it: {@code days} against a suggestion of {@code suggested}.
     */
    public void shelfLife(long productId, Long guideId, int days, int suggested) {
        jdbc.update(
                "UPDATE products SET shelf_life_guide_id = ?, storage_mode = 'chilled',"
                        + " shelf_life_days = ?, suggested_shelf_life_days = ?,"
                        + " shelf_life_extended = ?, shelf_life_ack_at = IF(?, NOW(), NULL)"
                        + " WHERE id = ?",
                guideId,
                days,
                suggested,
                days > suggested,
                days > suggested,
                productId);
    }

    /** "Leafy greens" kept in the fridge with {@code suggestedDays}, in one category. */
    public long guide(long categoryId, int suggestedDays) {
        return insert(
                "INSERT INTO shelf_life_guides (category_id, group_name, examples, storage_mode,"
                        + " suggested_days) VALUES (?, 'Leafy greens', 'rau muống', 'chilled', ?)",
                categoryId,
                suggestedDays);
    }

    private long insert(String sql, Object... args) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                con -> {
                    PreparedStatement ps =
                            con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    for (int i = 0; i < args.length; i++) {
                        ps.setObject(i + 1, args[i]);
                    }
                    return ps;
                },
                keys);
        return keys.getKey().longValue();
    }
}
