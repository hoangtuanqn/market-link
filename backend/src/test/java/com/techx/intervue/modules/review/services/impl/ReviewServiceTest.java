package com.techx.intervue.modules.review.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.review.entities.Review;
import com.techx.intervue.modules.review.enums.ReviewTarget;
import com.techx.intervue.modules.review.exceptions.AlreadyRespondedException;
import com.techx.intervue.modules.review.exceptions.AlreadyReviewedException;
import com.techx.intervue.modules.review.exceptions.OrderNotCompletedException;
import com.techx.intervue.modules.review.exceptions.ReviewNotYoursException;
import com.techx.intervue.modules.review.exceptions.TargetNotInOrderException;
import com.techx.intervue.modules.review.repositories.ReviewQueryRepository;
import com.techx.intervue.modules.review.repositories.ReviewRepository;
import com.techx.intervue.modules.review.repositories.ReviewResponseRepository;
import com.techx.intervue.modules.review.requests.CreateReviewRequest;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

/**
 * FR-050…053, D-10 (only a completed order can be reviewed), D-13 (admin never reviews), Review
 * Focus #3 (a changed {id} on the URL is 403, never 404). Repositories are plain mocks; the real
 * SQL is proven by {@link ReviewRatingCacheTest} on MySQL.
 */
class ReviewServiceTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long CUSTOMER_ID = 7L;
    private static final long OTHER_CUSTOMER_ID = 8L;
    private static final long ADMIN_ID = 1L;
    private static final long FARMER_USER_ID = 40L;
    private static final long OTHER_FARMER_USER_ID = 41L;
    private static final long FARMER_ID = 10L;
    private static final long OTHER_FARMER_ID = 11L;
    private static final long ORDER_ID = 500L;
    private static final long PRODUCT_ID = 100L;
    private static final long OTHER_PRODUCT_ID = 101L;
    private static final long REVIEW_ID = 900L;

    private UserRepository users;
    private OrderRepository orders;
    private OrderItemRepository orderItems;
    private FarmerProfileRepository farmers;
    private ReviewRepository reviews;
    private ReviewResponseRepository responses;
    private ReviewService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        orders = mock(OrderRepository.class);
        orderItems = mock(OrderItemRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        reviews = mock(ReviewRepository.class);
        responses = mock(ReviewResponseRepository.class);
        Clock clock = Clock.fixed(ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, HCM).toInstant(), HCM);
        service =
                new ReviewService(
                        users,
                        orders,
                        orderItems,
                        mock(ProductRepository.class),
                        farmers,
                        reviews,
                        responses,
                        mock(ReviewQueryRepository.class),
                        clock);

        when(users.findById(CUSTOMER_ID))
                .thenReturn(Optional.of(user(CUSTOMER_ID, RoleType.CUSTOMER)));
        when(users.findById(ADMIN_ID)).thenReturn(Optional.of(user(ADMIN_ID, RoleType.ADMIN)));
        when(orders.findById(ORDER_ID))
                .thenReturn(Optional.of(order(CUSTOMER_ID, OrderStatus.COMPLETED)));
        when(orderItems.findByOrderId(ORDER_ID)).thenReturn(List.of(item(PRODUCT_ID)));
        when(reviews.save(any()))
                .thenAnswer(
                        inv -> {
                            Review r = inv.getArgument(0);
                            r.setId(REVIEW_ID);
                            return r;
                        });
    }

    // ---------- create ----------

    @Test
    void createRequiresTheOrderToBeCompleted() {
        when(orders.findById(ORDER_ID))
                .thenReturn(Optional.of(order(CUSTOMER_ID, OrderStatus.READY)));

        assertThatThrownBy(() -> service.create(CUSTOMER_ID, productReview(5)))
                .isInstanceOf(OrderNotCompletedException.class);
        verify(reviews, never()).save(any());
    }

    @Test
    void createRequiresTheOrderToBelongToTheReviewer() {
        when(orders.findById(ORDER_ID))
                .thenReturn(Optional.of(order(OTHER_CUSTOMER_ID, OrderStatus.COMPLETED)));

        assertThatThrownBy(() -> service.create(CUSTOMER_ID, productReview(5)))
                .isInstanceOf(OrderNotYoursException.class);
        verify(reviews, never()).save(any());
    }

    @Test
    void createRejectsAProductThatWasNotInThatOrder() {
        CreateReviewRequest request =
                new CreateReviewRequest(ORDER_ID, "product", OTHER_PRODUCT_ID, null, 5, "Fresh");

        assertThatThrownBy(() -> service.create(CUSTOMER_ID, request))
                .isInstanceOf(TargetNotInOrderException.class);
        verify(reviews, never()).save(any());
    }

    @Test
    void createRejectsAFarmerWhoDidNotFulfilThatOrder() {
        CreateReviewRequest request =
                new CreateReviewRequest(ORDER_ID, "farmer", null, OTHER_FARMER_ID, 5, "Kind");

        assertThatThrownBy(() -> service.create(CUSTOMER_ID, request))
                .isInstanceOf(TargetNotInOrderException.class);
        verify(reviews, never()).save(any());
    }

    @Test
    void createRejectsASecondReviewOfTheSameTarget() {
        when(reviews.existsByOrderIdAndTargetTypeAndProductId(
                        ORDER_ID, ReviewTarget.PRODUCT, PRODUCT_ID))
                .thenReturn(true);

        assertThatThrownBy(() -> service.create(CUSTOMER_ID, productReview(4)))
                .isInstanceOf(AlreadyReviewedException.class);
        verify(reviews, never()).save(any());
    }

    @Test
    void createAllowsBothAProductAndAFarmerReviewOnOneOrder() {
        service.create(CUSTOMER_ID, productReview(5));
        service.create(CUSTOMER_ID, farmerReview(4));

        ArgumentCaptor<Review> saved = ArgumentCaptor.forClass(Review.class);
        verify(reviews, times(2)).save(saved.capture());
        assertThat(saved.getAllValues())
                .extracting(Review::getTargetType)
                .containsExactly(ReviewTarget.PRODUCT, ReviewTarget.FARMER);
        assertThat(saved.getAllValues().get(0).getProductId()).isEqualTo(PRODUCT_ID);
        assertThat(saved.getAllValues().get(1).getFarmerId()).isEqualTo(FARMER_ID);
    }

    @Test
    void createRejectsRatingOutsideOneToFive() {
        assertThatThrownBy(() -> service.create(CUSTOMER_ID, productReview(0)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.create(CUSTOMER_ID, productReview(6)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(reviews, never()).save(any());
    }

    @Test
    void adminCannotReview() {
        assertThatThrownBy(() -> service.create(ADMIN_ID, productReview(5)))
                .isInstanceOf(AccessDeniedException.class);
        verify(reviews, never()).save(any());
    }

    // ---------- read ----------

    @Test
    void forProductHidesModeratedReviews() {
        assertThat(ReviewQueryRepository.FOR_PRODUCT_SQL).contains("r.status = 'visible'");
        assertThat(ReviewQueryRepository.FOR_FARMER_SQL).contains("r.status = 'visible'");
        assertThat(ReviewQueryRepository.SUMMARY_SQL).contains("status = 'visible'");
    }

    // ---------- respond ----------

    @Test
    void respondRejectsAReviewOfAnotherStall() {
        when(farmers.findByUserId(OTHER_FARMER_USER_ID))
                .thenReturn(Optional.of(profile(OTHER_FARMER_ID)));
        when(farmers.findByUserId(FARMER_USER_ID)).thenReturn(Optional.of(profile(FARMER_ID)));
        when(reviews.findById(REVIEW_ID)).thenReturn(Optional.of(farmerReviewOf(FARMER_ID)));

        assertThatThrownBy(() -> service.respond(OTHER_FARMER_USER_ID, REVIEW_ID, "Thanks"))
                .isInstanceOf(ReviewNotYoursException.class);
        verify(responses, never()).save(any());

        when(responses.existsByReviewId(REVIEW_ID)).thenReturn(true);
        assertThatThrownBy(() -> service.respond(FARMER_USER_ID, REVIEW_ID, "Thanks"))
                .isInstanceOf(AlreadyRespondedException.class);
        verify(responses, never()).save(any());
    }

    // ---------- fixtures ----------

    private static User user(long id, RoleType role) {
        User u = new User();
        u.setId(id);
        u.setFullName("User " + id);
        u.setRole(role);
        return u;
    }

    private static Order order(long customerId, OrderStatus status) {
        Order o = new Order();
        o.setId(ORDER_ID);
        o.setCustomerId(customerId);
        o.setFarmerId(FARMER_ID);
        o.setStatus(status);
        return o;
    }

    private static OrderItem item(long productId) {
        OrderItem i = new OrderItem();
        i.setOrderId(ORDER_ID);
        i.setProductId(productId);
        i.setQuantity(1);
        return i;
    }

    private static FarmerProfile profile(long id) {
        FarmerProfile p = new FarmerProfile();
        p.setId(id);
        return p;
    }

    private static Review farmerReviewOf(long farmerId) {
        Review r = new Review();
        r.setId(REVIEW_ID);
        r.setOrderId(ORDER_ID);
        r.setCustomerId(CUSTOMER_ID);
        r.setTargetType(ReviewTarget.FARMER);
        r.setFarmerId(farmerId);
        r.setRating(4);
        return r;
    }

    private static CreateReviewRequest productReview(int rating) {
        return new CreateReviewRequest(ORDER_ID, "product", PRODUCT_ID, null, rating, "Fresh");
    }

    private static CreateReviewRequest farmerReview(int rating) {
        return new CreateReviewRequest(ORDER_ID, "farmer", null, FARMER_ID, rating, "Kind");
    }
}
