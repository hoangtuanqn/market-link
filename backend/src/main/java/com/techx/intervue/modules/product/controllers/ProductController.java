package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.ProductSearchCriteria;
import com.techx.intervue.modules.product.resources.ProductDetailResource;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.modules.product.services.interfaces.ProductQueryServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/v1/products, /api/v1/products/{id} — Public (contract §5). FR-020…023. */
@RestController
@RequestMapping("/api/v1/products")
@AllArgsConstructor
public class ProductController extends BaseController {

    private final ProductQueryServiceInterface products;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<ProductListItemResource>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long marketId,
            @RequestParam(required = false) Long farmerId,
            @RequestParam(required = false) Integer day,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ok(
                products.search(
                        new ProductSearchCriteria(
                                q,
                                categoryId,
                                marketId,
                                farmerId,
                                day,
                                minPrice,
                                maxPrice,
                                sort,
                                page,
                                pageSize)),
                "");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<ProductDetailResource>> detail(@PathVariable long id) {
        return ok(products.detail(id), "");
    }
}
