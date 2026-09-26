package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.modules.product.services.interfaces.ProductQueryServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/v1/farmers/{id}/products — this week's stock of a stall (contract §4, FR-011). Lives in
 * the product module (not stall) so the dependency direction product → stall stays one-way.
 */
@RestController
@RequestMapping("/api/v1/farmers/{farmerId}/products")
@AllArgsConstructor
public class FarmerProductsPublicController extends BaseController {

    private final ProductQueryServiceInterface products;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<ProductListItemResource>>> list(
            @PathVariable long farmerId,
            @RequestParam(required = false) Integer day,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int pageSize) {
        return ok(products.byFarmer(farmerId, day, page, pageSize), "");
    }
}
