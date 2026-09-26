package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.MarketDetailResource;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.modules.catalog.services.interfaces.MarketServiceInterface;
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
 * GET /api/v1/markets, /api/v1/markets/{id} — Public (khai trong SecurityConfig). FR-010, FR-012.
 */
@RestController
@RequestMapping("/api/v1/markets")
@AllArgsConstructor
public class MarketController extends BaseController {

    private final MarketServiceInterface marketService;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<MarketResource>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer day,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String district,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ok(marketService.search(q, day, city, district, page, pageSize), "");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<MarketDetailResource>> detail(@PathVariable long id) {
        return ok(marketService.detail(id), "");
    }
}
