package com.techx.intervue.modules.review.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.review.resources.ReviewResource;
import com.techx.intervue.modules.review.services.interfaces.ReviewServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-052 — reviews other customers left, readable before signing in (contract §8, Public). */
@RestController
@AllArgsConstructor
public class PublicReviewController extends BaseController {

    private final ReviewServiceInterface reviews;

    @GetMapping("/api/v1/products/{id}/reviews")
    public ResponseEntity<ApiResource<PageResource<ReviewResource>>> forProduct(
            @PathVariable long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ok(reviews.forProduct(id, page, pageSize), "Reviews loaded.");
    }

    @GetMapping("/api/v1/farmers/{id}/reviews")
    public ResponseEntity<ApiResource<PageResource<ReviewResource>>> forFarmer(
            @PathVariable long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ok(reviews.forFarmer(id, page, pageSize), "Reviews loaded.");
    }
}
