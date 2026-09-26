package com.techx.intervue.modules.order.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.requests.DeclineOrderRequest;
import com.techx.intervue.modules.order.resources.OrderDetailResource;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * /api/v1/farmer/orders (contract §7) — FR-036, 065, 066: orders placed at the Farmer's own stall,
 * and the four status changes the Farmer makes (accept/decline/ready/complete). The list filters by
 * status and pickup date (pickup_date); every value goes through a parameter (R-04).
 */
@RestController
@RequestMapping("/api/v1/farmer/orders")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerOrderController extends BaseController {

    private final OrderServiceInterface orderService;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<OrderListItemResource>>> mine(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ok(orderService.farmerOrders(user.getId(), status, date, page, pageSize), "");
    }

    @PatchMapping("/{id}/accept")
    public ResponseEntity<ApiResource<OrderDetailResource>> accept(
            @PathVariable long id, @AuthenticationPrincipal CustomUserDetails user) {
        return ok(orderService.accept(user.getId(), id), "Order accepted.");
    }

    @PatchMapping("/{id}/decline")
    public ResponseEntity<ApiResource<OrderDetailResource>> decline(
            @PathVariable long id,
            @Valid @RequestBody DeclineOrderRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(orderService.decline(user.getId(), id, request.reason()), "Order declined.");
    }

    @PatchMapping("/{id}/ready")
    public ResponseEntity<ApiResource<OrderDetailResource>> ready(
            @PathVariable long id, @AuthenticationPrincipal CustomUserDetails user) {
        return ok(orderService.markReady(user.getId(), id), "Order marked ready.");
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResource<OrderDetailResource>> complete(
            @PathVariable long id, @AuthenticationPrincipal CustomUserDetails user) {
        return ok(orderService.complete(user.getId(), id), "Order completed.");
    }
}
