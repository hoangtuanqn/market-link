package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.modules.product.services.interfaces.DealQueryServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/deals")
@AllArgsConstructor
public class DealController extends BaseController {

    private final DealQueryServiceInterface deals;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<DealResource>>> list(
            @RequestParam(required = false) Long marketId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Integer day,
            @RequestParam(required = false) Long productId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ok(
                deals.search(
                        new DealSearchCriteria(
                                marketId, categoryId, day, productId, page, pageSize)),
                "");
    }
}
