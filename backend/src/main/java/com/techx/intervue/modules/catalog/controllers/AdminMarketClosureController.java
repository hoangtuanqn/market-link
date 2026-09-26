package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.requests.MarketClosureRequest;
import com.techx.intervue.modules.catalog.resources.MarketClosureResource;
import com.techx.intervue.modules.catalog.services.interfaces.MarketClosureServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The "Closed days" panel on the Market form (FE) — no official FR in REQUIREMENTS.md yet, see
 * migration V20260926014. Admin only (role comes from the token, R-06).
 */
@RestController
@RequestMapping("/api/v1/admin/markets/{marketId}/closures")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminMarketClosureController extends BaseController {

    private final MarketClosureServiceInterface closureService;

    @GetMapping
    public ResponseEntity<ApiResource<List<MarketClosureResource>>> list(
            @PathVariable long marketId) {
        return ok(closureService.list(marketId), "");
    }

    @PostMapping
    public ResponseEntity<ApiResource<MarketClosureResource>> create(
            @PathVariable long marketId,
            @Valid @RequestBody MarketClosureRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return created(
                closureService.create(marketId, request, admin == null ? null : admin.getId()),
                "Closed day added.");
    }

    @DeleteMapping("/{closureId}")
    public ResponseEntity<ApiResource<Void>> delete(
            @PathVariable long marketId, @PathVariable long closureId) {
        closureService.delete(marketId, closureId);
        return ok(null, "Closed day removed.");
    }
}
