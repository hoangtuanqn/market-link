package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.MarketDetailResource;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.modules.catalog.services.interfaces.MarketServiceInterface;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/markets")
@AllArgsConstructor
public class MarketController extends BaseController {

    private final MarketServiceInterface marketService;
    private final StallServiceInterface stallService;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<MarketResource>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer day,
            @RequestParam(required = false) String provinceCode,
            @RequestParam(required = false) String wardCode,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ok(marketService.search(q, day, provinceCode, wardCode, page, pageSize), "");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<MarketDetailResource>> detail(@PathVariable long id) {
        return ok(marketService.detail(id), "");
    }

    @GetMapping("/{id}/farmers")
    public ResponseEntity<ApiResource<List<StallSummaryResource>>> farmers(
            @PathVariable long id, @RequestParam(required = false) Integer day) {
        marketService.detail(id);
        return ok(stallService.atMarket(id, day), "");
    }
}
