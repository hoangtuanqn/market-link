package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import com.techx.intervue.modules.product.services.interfaces.FarmerDealServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/farmer")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerDealController extends BaseController {

    private final FarmerDealServiceInterface deals;

    @GetMapping("/deals")
    public ResponseEntity<ApiResource<List<FarmerDealResource>>> mine(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(deals.mine(user.getId()), "");
    }

    @GetMapping("/products/{id}/daily-stock")
    public ResponseEntity<ApiResource<List<DailyStockResource>>> upcomingDays(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        return ok(deals.upcomingDays(user.getId(), id), "");
    }

    @PutMapping("/products/{id}/daily-stock/{date}/deal")
    public ResponseEntity<ApiResource<DailyStockResource>> post(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody DealRequest request) {
        return ok(deals.post(user.getId(), id, date, request), "Deal posted.");
    }

    @DeleteMapping("/products/{id}/daily-stock/{date}/deal")
    public ResponseEntity<ApiResource<Void>> remove(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        deals.remove(user.getId(), id, date);
        return ok(null, "Deal removed.");
    }
}
