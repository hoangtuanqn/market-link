package com.techx.intervue.modules.review.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.review.entities.Review;
import com.techx.intervue.modules.review.entities.ReviewResponse;
import com.techx.intervue.modules.review.enums.ReviewStatus;
import com.techx.intervue.modules.review.enums.ReviewTarget;
import com.techx.intervue.modules.review.exceptions.AlreadyRespondedException;
import com.techx.intervue.modules.review.exceptions.AlreadyReviewedException;
import com.techx.intervue.modules.review.exceptions.OrderNotCompletedException;
import com.techx.intervue.modules.review.exceptions.ReviewNotFoundException;
import com.techx.intervue.modules.review.exceptions.ReviewNotYoursException;
import com.techx.intervue.modules.review.exceptions.TargetNotInOrderException;
import com.techx.intervue.modules.review.repositories.ReviewQueryRepository;
import com.techx.intervue.modules.review.repositories.ReviewRepository;
import com.techx.intervue.modules.review.repositories.ReviewResponseRepository;
import com.techx.intervue.modules.review.requests.CreateReviewRequest;
import com.techx.intervue.modules.review.resources.ReviewResource;
import com.techx.intervue.modules.review.resources.ReviewResponseResource;
import com.techx.intervue.modules.review.resources.ReviewSummaryResource;
import com.techx.intervue.modules.review.services.interfaces.ReviewServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-050…053. {@link #create} checks, in this order: the order exists (404) → it belongs to the
 * caller (403, Review Focus #3) → it is {@code completed} (403, D-10) → the target was part of it
 * (400) → it has not been reviewed yet (409). After every write the rating cache of the target is
 * recomputed from the visible reviews with one statement (never accumulated).
 */
@Service
@AllArgsConstructor
public class ReviewService implements ReviewServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final FarmerProfileRepository farmerRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewResponseRepository responseRepository;
    private final ReviewQueryRepository queries;
    private final Clock clock;

    @Override
    @Transactional
    public ReviewResource create(long userId, CreateReviewRequest request) {
        User reviewer = requireReviewer(userId);
        int rating = requireRating(request.rating());
        ReviewTarget target = ReviewTarget.parse(request.targetType());

        Order order =
                orderRepository
                        .findById(request.orderId())
                        .orElseThrow(() -> new OrderNotFoundException(request.orderId()));
        if (!Objects.equals(order.getCustomerId(), userId)) {
            throw new OrderNotYoursException();
        }
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new OrderNotCompletedException();
        }

        Review review = new Review();
        review.setCustomerId(userId);
        review.setOrderId(order.getId());
        review.setTargetType(target);
        review.setRating(rating);
        review.setComment(blankToNull(request.comment()));
        review.setCreatedAt(Instant.now(clock));

        if (target == ReviewTarget.PRODUCT) {
            Long productId = request.productId();
            if (productId == null || !orderContains(order.getId(), productId)) {
                throw new TargetNotInOrderException();
            }
            if (reviewRepository.existsByOrderIdAndTargetTypeAndProductId(
                    order.getId(), target, productId)) {
                throw new AlreadyReviewedException();
            }
            review.setProductId(productId);
        } else {
            Long farmerId = request.farmerId();
            if (farmerId == null || !Objects.equals(order.getFarmerId(), farmerId)) {
                throw new TargetNotInOrderException();
            }
            if (reviewRepository.existsByOrderIdAndTargetTypeAndFarmerId(
                    order.getId(), target, farmerId)) {
                throw new AlreadyReviewedException();
            }
            review.setFarmerId(farmerId);
        }

        Review saved = reviewRepository.save(review);
        recompute(saved);
        return toResource(saved, reviewer.getFullName(), null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<ReviewResource> forProduct(long productId, int page, int pageSize) {
        return queries.forProduct(productId, safePage(page), safeSize(pageSize));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<ReviewResource> forFarmer(long farmerId, int page, int pageSize) {
        return queries.forFarmer(farmerId, safePage(page), safeSize(pageSize));
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewSummaryResource productSummary(long productId) {
        return queries.summary(ReviewTarget.PRODUCT, productId);
    }

    /**
     * R-06: the review must be about the caller's own stall — directly (stall review) or through
     * the product's {@code farmer_id} (product review). Another stall's review is 403 even though
     * it exists.
     */
    @Override
    @Transactional
    public ReviewResponseResource respond(long farmerUserId, long reviewId, String responseText) {
        FarmerProfile stall =
                farmerRepository
                        .findByUserId(farmerUserId)
                        .orElseThrow(() -> new AccessDeniedException("No stall for this account."));
        Review review =
                reviewRepository.findById(reviewId).orElseThrow(ReviewNotFoundException::new);
        if (!Objects.equals(stallOf(review), stall.getId())) {
            throw new ReviewNotYoursException();
        }
        if (responseRepository.existsByReviewId(reviewId)) {
            throw new AlreadyRespondedException();
        }
        ReviewResponse response = new ReviewResponse();
        response.setReviewId(reviewId);
        response.setFarmerId(stall.getId());
        response.setResponseText(responseText.trim());
        response.setCreatedAt(Instant.now(clock));
        ReviewResponse saved = responseRepository.save(response);
        return new ReviewResponseResource(
                saved.getId(), saved.getResponseText(), saved.getCreatedAt().toString());
    }

    @Override
    @Transactional
    public void adminSetStatus(long reviewId, boolean hidden) {
        Review review =
                reviewRepository.findById(reviewId).orElseThrow(ReviewNotFoundException::new);
        review.setStatus(hidden ? ReviewStatus.HIDDEN : ReviewStatus.VISIBLE);
        reviewRepository.saveAndFlush(review);
        recompute(review);
    }

    // ---------- helpers ----------

    /** D-13: admin accounts never review; the FE hiding the form is not enough. */
    private User requireReviewer(long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AccessDeniedException("Unknown account."));
        if (user.getRole() == RoleType.ADMIN) {
            throw new AccessDeniedException("Admin accounts cannot write reviews.");
        }
        return user;
    }

    /** Server-side twin of the request's {@code @Min/@Max} (validation on both sides). */
    private static int requireRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("rating must be between 1 and 5.");
        }
        return rating;
    }

    private boolean orderContains(long orderId, long productId) {
        return orderItemRepository.findByOrderId(orderId).stream()
                .map(OrderItem::getProductId)
                .anyMatch(id -> id != null && id == productId);
    }

    private Long stallOf(Review review) {
        if (review.getTargetType() == ReviewTarget.FARMER) {
            return review.getFarmerId();
        }
        return productRepository
                .findById(review.getProductId())
                .map(p -> p.getFarmerId())
                .orElse(null);
    }

    private void recompute(Review review) {
        if (review.getTargetType() == ReviewTarget.PRODUCT) {
            queries.recomputeProductRating(review.getProductId());
        } else {
            queries.recomputeFarmerRating(review.getFarmerId());
        }
    }

    private static ReviewResource toResource(
            Review r, String customerName, ReviewResponseResource response) {
        return new ReviewResource(
                r.getId(),
                r.getTargetType().value(),
                r.targetId(),
                customerName,
                r.getRating(),
                r.getComment(),
                r.getCreatedAt() == null ? null : r.getCreatedAt().toString(),
                response);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static int safePage(int page) {
        return Math.max(1, page);
    }

    private static int safeSize(int size) {
        return Math.min(MAX_PAGE_SIZE, Math.max(1, size));
    }
}
