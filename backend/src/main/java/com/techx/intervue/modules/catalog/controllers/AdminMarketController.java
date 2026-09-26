package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.requests.MarketRequest;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.modules.catalog.services.interfaces.MarketServiceInterface;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-073 — Admin thêm/sửa/gỡ chợ (contract §3). Chỉ Admin (role lấy từ token, R-06). */
@RestController
@RequestMapping("/api/v1/admin/markets")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminMarketController extends BaseController {

    private final MarketServiceInterface marketService;

    @PostMapping
    public ResponseEntity<ApiResource<MarketResource>> create(
            @Valid @RequestBody MarketRequest request) {
        return created(marketService.create(request), "Market added.");
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResource<MarketResource>> update(
            @PathVariable long id, @Valid @RequestBody MarketRequest request) {
        return ok(marketService.update(id, request), "Market saved.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResource<Void>> deactivate(@PathVariable long id) {
        marketService.deactivate(id);
        return ok(null, "Market removed.");
    }
}
