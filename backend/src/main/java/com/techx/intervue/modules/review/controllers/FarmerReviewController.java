package com.techx.intervue.modules.review.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.review.requests.RespondReviewRequest;
import com.techx.intervue.modules.review.resources.ReviewResponseResource;
import com.techx.intervue.modules.review.services.interfaces.ReviewServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-053 — {@code POST /farmer/reviews/{id}/response} (contract §8). */
@RestController
@RequestMapping("/api/v1/farmer/reviews")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerReviewController extends BaseController {

    private final ReviewServiceInterface reviews;

    @PostMapping("/{id}/response")
    public ResponseEntity<ApiResource<ReviewResponseResource>> respond(
            @PathVariable long id,
            @Valid @RequestBody RespondReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return created(
                reviews.respond(user.getId(), id, request.responseText()), "Response posted.");
    }
}
