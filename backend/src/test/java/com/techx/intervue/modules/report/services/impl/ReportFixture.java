package com.techx.intervue.modules.report.services.impl;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * Rows for the report tests on the real (shared, seeded) dev database. Every row carries a unique
 * tag; {@link #cleanUp()} deletes them in reverse insertion order, and the FK cascades take the
 * order items, status history and reviews with the orders.
 */
public final class ReportFixture {

    private final JdbcTemplate jdbc;
    public final String tag = UUID.randomUUID().toString().substring(0, 8);
    private final Deque<String[]> created = new ArrayDeque<>();
    private int orderSeq;

    public ReportFixture(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long category() {
        return track(
                "categories",
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Report " + tag,
                        "report-" + tag));
    }

    public long market(String name) {
        return track(
                "markets",
                insert(
                        "INSERT INTO markets (market_name, address, latitude, longitude,"
                                + " opening_time, closing_time) VALUES (?, 'x', 10.8, 106.7,"
                                + " '06:00:00', '12:00:00')",
                        name + " " + tag));
    }

    public long user(String role, String label, String passwordHash) {
        return track(
                "users",
                insert(
                        "INSERT INTO users (full_name, email, password_hash, role) VALUES"
                                + " (?, ?, ?, ?)",
                        label + " " + tag,
                        label.toLowerCase().replace(' ', '-') + "-" + tag + "@report.test",
                        passwordHash,
                        role));
    }

    public long farmer(long userId, String stall, String approvalStatus) {
        return track(
                "farmer_profiles",
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, ?)",
                        userId,
                        stall + " " + tag,
                        "Seller " + tag,
                        approvalStatus));
    }

    public long product(long farmerId, long categoryId, String name, int price) {
        return track(
                "products",
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, ?, 'kg', 9)",
                        farmerId,
                        categoryId,
                        name + " " + tag,
                        price));
    }

    public long order(
            long customerId,
            long farmerId,
            long marketId,
            String status,
            int totalAmount,
            LocalDate pickupDate) {
        return track(
                "orders",
                insert(
                        "INSERT INTO orders (order_code, customer_id, farmer_id, market_id,"
                                + " pickup_date, pickup_start, pickup_end, cutoff_at,"
                                + " total_amount, status) VALUES (?, ?, ?, ?, ?, '07:00:00',"
                                + " '08:00:00', NOW(), ?, ?)",
                        "RP-" + tag + "-" + (++orderSeq),
                        customerId,
                        farmerId,
                        marketId,
                        pickupDate,
                        totalAmount,
                        status));
    }

    public void item(long orderId, long productId, int unitPrice, int quantity) {
        insert(
                "INSERT INTO order_items (order_id, product_id, product_name, unit_price, unit,"
                        + " quantity, subtotal) VALUES (?, ?, 'p', ?, 'kg', ?, ?)",
                orderId,
                productId,
                unitPrice,
                quantity,
                unitPrice * quantity);
    }

    public void cleanUp() {
        while (!created.isEmpty()) {
            String[] row = created.pop();
            if (row[0].equals("users")) {
                jdbc.update("DELETE FROM refresh_tokens WHERE user_id = ?", Long.valueOf(row[1]));
            }
            jdbc.update("DELETE FROM " + row[0] + " WHERE id = ?", Long.valueOf(row[1]));
        }
    }

    private long track(String table, long id) {
        created.push(new String[] {table, String.valueOf(id)});
        return id;
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
