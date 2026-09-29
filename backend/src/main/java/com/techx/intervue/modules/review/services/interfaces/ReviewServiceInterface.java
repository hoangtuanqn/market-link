package com.techx.intervue.modules.review.services.interfaces;

import com.techx.intervue.modules.review.requests.CreateReviewRequest;
import com.techx.intervue.modules.review.resources.AdminReviewResource;
import com.techx.intervue.modules.review.resources.ReviewResource;
import com.techx.intervue.modules.review.resources.ReviewResponseResource;
import com.techx.intervue.modules.review.resources.ReviewSummaryResource;
import com.techx.intervue.resources.PageResource;

public interface ReviewServiceInterface {

    ReviewResource create(long userId, CreateReviewRequest request);

    PageResource<ReviewResource> forProduct(long productId, int page, int pageSize);

    PageResource<ReviewResource> forFarmer(long farmerId, int page, int pageSize);

    ReviewSummaryResource productSummary(long productId);

    ReviewResponseResource respond(long farmerUserId, long reviewId, String responseText);

    void adminSetStatus(long reviewId, boolean hidden);

    PageResource<AdminReviewResource> adminList(
            String status, Integer maxRating, Long customerId, int page, int pageSize);

    PageResource<ReviewResource> forStallOwner(long farmerUserId, int page, int pageSize);
}
