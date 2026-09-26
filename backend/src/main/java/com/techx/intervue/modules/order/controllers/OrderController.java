package com.techx.intervue.modules.order.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderDetailResource;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.order.resources.OrderPreviewResource;
import com.techx.intervue.modules.order.resources.PlacedOrdersResource;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /api/v1/orders/preview, POST /api/v1/orders, GET /api/v1/orders, GET /api/v1/orders/{id}
 * (contract §7) — FR-030…033, 036, 065. D-13 / C5-4: customer và farmer đều mua và xem được; admin
 * bị chặn ở đây và cả ở service.
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

    /** Đơn của chính người gọi với vai buyer (D-13: Farmer cũng mua hàng), mới nhất trước. */
    @GetMapping
    public ResponseEntity<ApiResource<PageResource<OrderListItemResource>>> mine(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ok(orderService.myOrders(user.getId(), status, page, pageSize), "");
    }

    /**
     * Buyer của đơn hoặc Farmer sở hữu đơn mới đọc được (R-06); còn lại 403, kể cả khi id có thật
     * (Review focus #3).
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<OrderDetailResource>> detail(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        return ok(orderService.detail(user.getId(), id), "");
    }
}
