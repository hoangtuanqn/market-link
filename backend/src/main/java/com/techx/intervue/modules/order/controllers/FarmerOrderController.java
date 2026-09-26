package com.techx.intervue.modules.order.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/v1/farmer/orders (contract §7) — FR-036, 065: đơn đặt tại sạp của chính Farmer. Lọc theo
 * trạng thái và ngày nhận hàng (pickup_date); mọi giá trị đi qua tham số (R-04).
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
}
