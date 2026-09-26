package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.requests.ProductStatusRequest;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.modules.product.services.interfaces.ProductServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-062, FR-064 — sản phẩm của chính Farmer (contract §5). Mọi thứ tra theo user của token (R-06).
 */
@RestController
@RequestMapping("/api/v1/farmer/products")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerProductController extends BaseController {

    private final ProductServiceInterface products;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<FarmerProductResource>>> mine(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int pageSize) {
        return ok(products.mine(user.getId(), status, page, pageSize), "");
    }

    @PostMapping
    public ResponseEntity<ApiResource<FarmerProductResource>> create(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody ProductRequest request) {
        return created(products.create(user.getId(), request), "Product added.");
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResource<FarmerProductResource>> update(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @Valid @RequestBody ProductRequest request) {
        return ok(products.update(user.getId(), id, request), "Product saved.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResource<Void>> remove(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        products.softDelete(user.getId(), id);
        return ok(null, "Product removed.");
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResource<FarmerProductResource>> setStatus(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @Valid @RequestBody ProductStatusRequest request) {
        return ok(products.setStatus(user.getId(), id, request.status()), "Product status saved.");
    }
}
