package com.techx.intervue.modules.review.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.review.resources.AdminReviewResource;
import com.techx.intervue.modules.review.services.interfaces.ReviewServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-074 — review moderation (contract §8). Hiding recomputes the target's rating cache. */
@RestController
@RequestMapping("/api/v1/admin/reviews")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminReviewController extends BaseController {

    private final ReviewServiceInterface reviews;

    /** The moderation queue — every status by default, filterable by status/rating/customer. */
    @GetMapping
    public ResponseEntity<ApiResource<PageResource<AdminReviewResource>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer maxRating,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(
                reviews.adminList(status, maxRating, customerId, page, pageSize),
                "Reviews loaded.");
    }

    @PatchMapping("/{id}/hide")
    public ResponseEntity<ApiResource<Void>> hide(@PathVariable long id) {
        reviews.adminSetStatus(id, true);
        return ok(null, "Review hidden.");
    }

    @PatchMapping("/{id}/unhide")
    public ResponseEntity<ApiResource<Void>> unhide(@PathVariable long id) {
        reviews.adminSetStatus(id, false);
        return ok(null, "Review visible again.");
    }
}
