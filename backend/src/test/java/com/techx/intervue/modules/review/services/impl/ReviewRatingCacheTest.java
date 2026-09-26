package com.techx.intervue.modules.review.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.review.requests.CreateReviewRequest;
import com.techx.intervue.modules.review.resources.ReviewResource;
import com.techx.intervue.modules.review.services.interfaces.ReviewServiceInterface;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * FR-050/051 rating caches on {@code products} and {@code farmer_profiles}. The cache is recomputed
 * from the visible reviews with one AVG/COUNT statement, never accumulated — accumulation goes
 * wrong the first time an admin hides a review (FR-074). Runs on MySQL: the rounding and the {@code
 * status = 'visible'} filter live in SQL, so a mock could not prove them.
 *
 * <p>The dev database is shared with the demo seed, so every row this test creates carries a unique
 * tag and is deleted in {@code @AfterEach}. Three completed orders of one customer at one stall,
 * each holding the same product, so up to three reviews per target fit under {@code uq_review}.
 */
@SpringBootTest
class ReviewRatingCacheTest {

    @Autowired private ReviewServiceInterface reviews;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private Long categoryId;
    private Long marketId;
    private Long customerId;
    private Long farmerUserId;
    private Long farmerId;
    private Long productId;
    private final List<Long> orderIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Rating cache " + tag,
                        "rating-cache-" + tag);
        marketId =
                insert(
                        "INSERT INTO markets (market_name, address, latitude, longitude,"
                                + " opening_time, closing_time) VALUES (?, 'x', 10.8, 106.7,"
                                + " '06:00:00', '12:00:00')",
                        "Market rating " + tag);
        customerId =
                insert(
                        "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?,"
                                + " 'x', 'customer')",
                        "Rating customer " + tag,
                        "customer-" + tag + "@rating-cache.test");
        farmerUserId =
                insert(
                        "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?,"
                                + " 'x', 'farmer')",
                        "Rating farmer " + tag,
                        "farmer-" + tag + "@rating-cache.test");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, 'approved')",
                        farmerUserId,
                        "Stall rating " + tag,
                        "Seller " + tag);
        productId =
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, 15000, 'kg', 9)",
                        farmerId,
                        categoryId,
                        "Rated product " + tag);
        for (int i = 0; i < 3; i++) {
            long orderId =
                    insert(
                            "INSERT INTO orders (order_code, customer_id, farmer_id, market_id,"
                                    + " pickup_date, pickup_start, pickup_end, cutoff_at,"
                                    + " total_amount, status) VALUES (?, ?, ?, ?, CURDATE(),"
                                    + " '07:00:00', '08:00:00', NOW(), 15000, 'completed')",
                            "RV-" + tag + "-" + i,
                            customerId,
                            farmerId,
                            marketId);
            insert(
                    "INSERT INTO order_items (order_id, product_id, product_name, unit_price, unit,"
                            + " quantity, subtotal) VALUES (?, ?, 'p', 15000, 'kg', 1, 15000)",
                    orderId,
                    productId);
            orderIds.add(orderId);
        }
    }

    @AfterEach
    void tearDown() {
        for (Long orderId : orderIds) {
            // reviews and their responses go with the order (ON DELETE CASCADE)
            jdbc.update("DELETE FROM orders WHERE id = ?", orderId);
        }
        jdbc.update("DELETE FROM products WHERE id = ?", productId);
        jdbc.update("DELETE FROM farmer_profiles WHERE id = ?", farmerId);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?)", customerId, farmerUserId);
        jdbc.update("DELETE FROM markets WHERE id = ?", marketId);
        jdbc.update("DELETE FROM categories WHERE id = ?", categoryId);
    }

    @Test
    void creatingAReviewUpdatesProductRatingAverage() {
        productReview(0, 4);
        productReview(1, 2);

        assertRating("products", productId, "3.00", 2);
    }

    @Test
    void creatingAReviewUpdatesFarmerRatingAverage() {
        farmerReview(0, 4);
        farmerReview(1, 2);

        assertRating("farmer_profiles", farmerId, "3.00", 2);
    }

    @Test
    void hidingAReviewRemovesItFromTheAverage() {
        productReview(0, 4);
        ReviewResource twoStars = productReview(1, 2);

        reviews.adminSetStatus(twoStars.id(), true);

        assertRating("products", productId, "4.00", 1);
    }

    @Test
    void averageRoundsToTwoDecimals() {
        productReview(0, 5);
        productReview(1, 4);
        productReview(2, 4);

        assertRating("products", productId, "4.33", 3);
    }

    private ReviewResource productReview(int orderIndex, int rating) {
        return reviews.create(
                customerId,
                new CreateReviewRequest(
                        orderIds.get(orderIndex), "product", productId, null, rating, "ok"));
    }

    private ReviewResource farmerReview(int orderIndex, int rating) {
        return reviews.create(
                customerId,
                new CreateReviewRequest(
                        orderIds.get(orderIndex), "farmer", null, farmerId, rating, "ok"));
    }

    private void assertRating(String table, long id, String avg, int count) {
        Map<String, Object> row =
                jdbc.queryForMap(
                        "SELECT rating_avg, rating_count FROM " + table + " WHERE id = ?", id);
        assertThat((BigDecimal) row.get("rating_avg")).isEqualByComparingTo(avg);
        assertThat(((Number) row.get("rating_count")).intValue()).isEqualTo(count);
    }

    private Long insert(String sql, Object... args) {
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
