package com.techx.intervue.modules.order.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.requests.ModifyOrderRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /api/v1/orders/preview, POST /api/v1/orders, GET /api/v1/orders, GET /api/v1/orders/{id}
 * (contract §7) — FR-030…033, 036, 065. D-13 / C5-4: customer and farmer can both buy and view;
 * admin is blocked here and also in the service.
 */
@RestController
@RequestMapping("/api/v1/orders")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class OrderController extends BaseController {

    private final OrderServiceInterface orderService;

    /** Which orders the cart will be split into; each order's problems live in {@code problems}. */
    @PostMapping("/preview")
    public ResponseEntity<ApiResource<OrderPreviewResource>> preview(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody PreviewRequest request) {
        return ok(new OrderPreviewResource(orderService.preview(user.getId(), request)), "");
    }

    /** Place the whole cart: one order per group. Out of stock, slot full, past cutoff → 409. */
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

    /**
     * FR-034 — chỉ khách mua huỷ được đơn của chính mình, trước cutoff. Sai chủ → 403; sai trạng
     * thái → 409 INVALID_TRANSITION; quá cutoff → 409 CUTOFF_PASSED (C5-18).
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResource<OrderDetailResource>> cancel(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        return ok(orderService.cancel(user.getId(), id), "Order cancelled.");
    }

    /**
     * FR-035 — sửa số lượng hoặc bỏ item trước cutoff, không bao giờ thêm sản phẩm mới (D-07). Tồn
     * kho đổi đúng phần chênh lệch; đơn {@code accepted} quay lại {@code placed}.
     */
    @PutMapping("/{id}/items")
    public ResponseEntity<ApiResource<OrderDetailResource>> modifyItems(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @Valid @RequestBody ModifyOrderRequest request) {
        return ok(orderService.modifyItems(user.getId(), id, request), "Order updated.");
    }
}
