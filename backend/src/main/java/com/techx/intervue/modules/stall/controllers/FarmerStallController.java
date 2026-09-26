package com.techx.intervue.modules.stall.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.stall.requests.JoinMarketRequest;
import com.techx.intervue.modules.stall.requests.OperatingDaysRequest;
import com.techx.intervue.modules.stall.requests.StallProfileRequest;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.resources.StallMarketResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-060, FR-061 — hồ sơ gian hàng của chính Farmer (contract §4). Mọi thứ tra theo user của token
 * (R-06); FarmerController của module farmer giữ /apply, controller này giữ /profile và /markets.
 */
@RestController
@RequestMapping("/api/v1/farmer")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerStallController extends BaseController {

    private final StallServiceInterface stallService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResource<StallDetailResource>> myProfile(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(stallService.myProfile(user.getId()), "");
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResource<StallDetailResource>> updateProfile(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody StallProfileRequest request) {
        return ok(stallService.updateProfile(user.getId(), request), "Stall profile saved.");
    }

    @PostMapping("/markets")
    public ResponseEntity<ApiResource<StallMarketResource>> joinMarket(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody JoinMarketRequest request) {
        return created(
                stallService.joinMarket(user.getId(), request), "Market added to your stall.");
    }

    @DeleteMapping("/markets/{farmerMarketId}")
    public ResponseEntity<ApiResource<Void>> leaveMarket(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long farmerMarketId) {
        stallService.leaveMarket(user.getId(), farmerMarketId);
        return ok(null, "Market removed from your stall.");
    }

    @PutMapping("/markets/{farmerMarketId}/days")
    public ResponseEntity<ApiResource<StallMarketResource>> setDays(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long farmerMarketId,
            @Valid @RequestBody OperatingDaysRequest request) {
        return ok(
                stallService.setDays(user.getId(), farmerMarketId, request),
                "Pickup windows saved.");
    }
}
