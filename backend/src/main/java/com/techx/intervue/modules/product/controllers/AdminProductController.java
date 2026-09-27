package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.HideProductRequest;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.modules.product.services.interfaces.ProductServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-074 — listing moderation (contract §10). Hiding/unhiding does not touch the Farmer's stock or
 * status.
 */
@RestController
@RequestMapping("/api/v1/admin/products")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminProductController extends BaseController {

    private final ProductServiceInterface products;

    /** FR-074: hidden listings, newest change first, for the moderation queue. */
    @GetMapping("/hidden")
    public ResponseEntity<ApiResource<PageResource<FarmerProductResource>>> hidden(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int pageSize) {
        return ok(products.adminHidden(page, pageSize), "");
    }

    @PatchMapping("/{id}/hide")
    public ResponseEntity<ApiResource<Void>> hide(
            @PathVariable long id, @Valid @RequestBody HideProductRequest request) {
        products.adminHide(id, request.reason());
        return ok(null, "Listing hidden. The stall can see why.");
    }

    @PatchMapping("/{id}/unhide")
    public ResponseEntity<ApiResource<Void>> unhide(@PathVariable long id) {
        products.adminUnhide(id);
        return ok(null, "Listing visible again.");
    }
}
