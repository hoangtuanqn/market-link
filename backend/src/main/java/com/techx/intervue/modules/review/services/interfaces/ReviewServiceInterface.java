package com.techx.intervue.modules.review.services.interfaces;

import com.techx.intervue.modules.review.requests.CreateReviewRequest;
import com.techx.intervue.modules.review.resources.ReviewResource;
import com.techx.intervue.modules.review.resources.ReviewResponseResource;
import com.techx.intervue.modules.review.resources.ReviewSummaryResource;
import com.techx.intervue.resources.PageResource;

/** FR-050…053 + FR-074 (review moderation). */
public interface ReviewServiceInterface {

    /**
     * Customer or Farmer (D-13: never admin) reviews a product or the stall of a completed order.
     */
    ReviewResource create(long userId, CreateReviewRequest request);

    PageResource<ReviewResource> forProduct(long productId, int page, int pageSize);

    PageResource<ReviewResource> forFarmer(long farmerId, int page, int pageSize);

    /**
     * Average + 5-slot histogram of a product's visible reviews (`reviewsSummary`, contract §5).
     */
    ReviewSummaryResource productSummary(long productId);

    /** The stall answers one of its reviews, once. */
    ReviewResponseResource respond(long farmerUserId, long reviewId, String responseText);

    /** FR-074: hide or unhide a review and recompute the affected rating cache. */
    void adminSetStatus(long reviewId, boolean hidden);
}
