package com.techx.intervue.modules.review.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.review.requests.CreateReviewRequest;
import com.techx.intervue.modules.review.resources.ReviewResource;
import com.techx.intervue.modules.review.services.interfaces.ReviewServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-050/051 — {@code POST /reviews} (contract §8). Farmers buy too (D-13), admins never. */
@RestController
@RequestMapping("/api/v1/reviews")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class ReviewController extends BaseController {

    private final ReviewServiceInterface reviews;

    @PostMapping
    public ResponseEntity<ApiResource<ReviewResource>> create(
            @Valid @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return created(reviews.create(user.getId(), request), "Thanks for your review.");
    }
}
