package com.techx.intervue.modules.stall.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/v1/farmers, /api/v1/farmers/{id} — Public (khai trong SecurityConfig). FR-011. */
@RestController
@RequestMapping("/api/v1/farmers")
@AllArgsConstructor
public class PublicFarmerController extends BaseController {

    private final StallServiceInterface stallService;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<StallSummaryResource>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long marketId,
            @RequestParam(required = false) Integer day,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ok(stallService.search(q, marketId, day, page, pageSize), "");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<StallDetailResource>> detail(@PathVariable long id) {
        return ok(stallService.publicDetail(id), "");
    }
}
