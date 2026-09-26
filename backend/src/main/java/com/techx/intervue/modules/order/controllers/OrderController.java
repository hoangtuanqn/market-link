package com.techx.intervue.modules.order.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderPreviewResource;
import com.techx.intervue.modules.order.resources.PlacedOrdersResource;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /api/v1/orders/preview, POST /api/v1/orders (contract §7) — FR-030, 031, 032. D-13 / C5-4:
 * customer và farmer mua được; admin bị chặn ở đây và cả ở service.
 */
@RestController
@RequestMapping("/api/v1/orders")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class OrderController extends BaseController {

    private final OrderServiceInterface orderService;

    /** Giỏ sẽ được tách thành những đơn nào; vấn đề từng đơn nằm trong {@code problems}. */
    @PostMapping("/preview")
    public ResponseEntity<ApiResource<OrderPreviewResource>> preview(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody PreviewRequest request) {
        return ok(new OrderPreviewResource(orderService.preview(user.getId(), request)), "");
    }

    /** Đặt cả giỏ: mỗi group một đơn. Hết hàng, slot đầy, quá cutoff → 409. */
    @PostMapping
    public ResponseEntity<ApiResource<PlacedOrdersResource>> place(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody PlaceOrderRequest request) {
        return created(
                new PlacedOrdersResource(orderService.place(user.getId(), request)),
                "Your order has been placed.");
    }
}
