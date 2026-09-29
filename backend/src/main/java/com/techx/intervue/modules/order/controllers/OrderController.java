package com.techx.intervue.modules.order.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.requests.CartLine;
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
import java.util.List;
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

@RestController
@RequestMapping("/api/v1/orders")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class OrderController extends BaseController {

    private final OrderServiceInterface orderService;

    @PostMapping("/preview")
    public ResponseEntity<ApiResource<OrderPreviewResource>> preview(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody PreviewRequest request) {
        return ok(new OrderPreviewResource(orderService.preview(user.getId(), request)), "");
    }

    @PostMapping
    public ResponseEntity<ApiResource<PlacedOrdersResource>> place(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody PlaceOrderRequest request) {
        return created(
                new PlacedOrdersResource(orderService.place(user.getId(), request)),
                "Your order has been placed.");
    }

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<OrderListItemResource>>> mine(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ok(orderService.myOrders(user.getId(), status, page, pageSize), "");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','FARMER','ADMIN')")
    public ResponseEntity<ApiResource<OrderDetailResource>> detail(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        return ok(orderService.detail(user.getId(), id), "");
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResource<OrderDetailResource>> cancel(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        return ok(orderService.cancel(user.getId(), id), "Order cancelled.");
    }

    @PutMapping("/{id}/items")
    public ResponseEntity<ApiResource<OrderDetailResource>> modifyItems(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long id,
            @Valid @RequestBody ModifyOrderRequest request) {
        return ok(orderService.modifyItems(user.getId(), id, request), "Order updated.");
    }

    @PostMapping("/{id}/reorder")
    public ResponseEntity<ApiResource<List<CartLine>>> reorder(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        return ok(orderService.reorder(user.getId(), id), "");
    }
}
