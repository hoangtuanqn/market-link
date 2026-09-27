package com.techx.intervue.modules.review.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.report.services.impl.ReportFixture;
import com.techx.intervue.modules.review.requests.CreateReviewRequest;
import com.techx.intervue.modules.review.resources.AdminReviewResource;
import com.techx.intervue.modules.review.resources.ReviewResource;
import com.techx.intervue.modules.review.services.interfaces.ReviewServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * FR-053/074 on MySQL: the stall owner's own review inbox (product + stall reviews of their own
 * stall) and the admin moderation queue (filter by status / rating / customer).
 */
@SpringBootTest
class ReviewListingTest {

    @Autowired private ReviewServiceInterface reviews;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;
    private String tag;
    private long customerId;
    private long farmerUserId;
    private long farmerId;
    private long productId;
    private final List<Long> orderIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        tag = fx.tag;
        long category = fx.category();
        long market = fx.market("Market");
        customerId = fx.user("customer", "Review customer", "x");
        farmerUserId = fx.user("farmer", "Review farmer", "x");
        farmerId = fx.farmer(farmerUserId, "Stall rating", "approved");
        productId = fx.product(farmerId, category, "Rated product", 15000);
        for (int i = 0; i < 2; i++) {
            long orderId =
                    fx.order(customerId, farmerId, market, "completed", 15000, LocalDate.now());
            fx.item(orderId, productId, 15000, 1);
            orderIds.add(orderId);
        }
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void adminListFiltersHiddenAndLowRatings() {
        ReviewResource good = productReview(0, 5);
        ReviewResource bad = productReview(1, 1);

        reviews.adminSetStatus(bad.id(), true);

        assertThat(reviews.adminList("hidden", null, null, 1, 50).items())
                .extracting(AdminReviewResource::id)
                .contains(bad.id())
                .doesNotContain(good.id());
        assertThat(reviews.adminList(null, 2, null, 1, 50).items())
                .extracting(AdminReviewResource::id)
                .contains(bad.id())
                .doesNotContain(good.id());
        assertThat(reviews.adminList(null, null, customerId, 1, 50).items())
                .extracting(AdminReviewResource::id)
                .contains(good.id());
    }

    @Test
    void farmerListCoversStallAndProductReviews() {
        productReview(0, 4);
        farmerReview(1, 5);

        PageResource<ReviewResource> mine = reviews.forStallOwner(farmerUserId, 1, 50);

        assertThat(mine.items()).hasSize(2);
        assertThat(mine.items())
                .extracting(ReviewResource::targetName)
                .contains("Rated product " + tag, "Stall rating " + tag);
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
}
