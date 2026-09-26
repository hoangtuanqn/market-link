package com.techx.intervue.modules.order.services.interfaces;

import com.techx.intervue.modules.order.requests.CartLine;
import com.techx.intervue.modules.order.requests.ModifyOrderRequest;
import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderDetailResource;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.order.resources.PlacedOrderResource;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import java.util.List;

/**
 * FR-030…032, 033, 036, 065 — cart, placing orders, and reading orders for both sides (contract
 * §7).
 */
public interface OrderServiceInterface {

    /** Read-only: no locking, changes nothing. Each group's issues live in {@code problems}. */
    List<OrderGroupPreviewResource> preview(Long userIdOrNull, PreviewRequest request);

    /**
     * One transaction: every order of the call is created, stock and slots are deducted — or
     * nothing happens at all.
     */
    List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request);

    /** {@code GET /orders} — the caller's own orders as the buyer, newest first. */
    PageResource<OrderListItemResource> myOrders(
            long userId, String status, int page, int pageSize);

    /**
     * {@code GET /orders/{id}} — only the order's buyer or Farmer can read it (R-06, Review focus
     * #3); anyone else gets {@code OrderNotYoursException} (403), a missing order {@code
     * OrderNotFoundException} (404).
     */
    OrderDetailResource detail(long userId, long orderId);

    /** {@code GET /farmer/orders} — orders placed at the Farmer's own stall, by pickup time. */
    PageResource<OrderListItemResource> farmerOrders(
            long userId, String status, LocalDate date, int page, int pageSize);

    /**
     * {@code PATCH /farmer/orders/{id}/accept} (FR-065) — {@code placed → accepted}. Wrong owner
     * (including an account without {@code farmer_profiles}) → {@code OrderNotYoursException}
     * (403); missing order → {@code OrderNotFoundException} (404); wrong order of steps → {@code
     * InvalidOrderTransitionException} (409, D-04).
     */
    OrderDetailResource accept(long userId, long orderId);

    /**
     * {@code PATCH /farmer/orders/{id}/decline} (FR-065, FR-066) — {@code placed/accepted →
     * declined}: restores stock and frees the slot spot (D-02), writes {@code reason} into {@code
     * farmer_note}.
     */
    OrderDetailResource decline(long userId, long orderId, String reason);

    /** {@code PATCH /farmer/orders/{id}/ready} — {@code accepted → ready}. */
    OrderDetailResource markReady(long userId, long orderId);

    /**
     * {@code PATCH /farmer/orders/{id}/complete} — {@code ready → completed}; stock is not
     * restored.
     */
    OrderDetailResource complete(long userId, long orderId);

    /**
     * {@code PATCH /orders/{id}/cancel} (FR-034) — only the buyer ({@code customer_id}) can cancel
     * (otherwise 403, {@code OrderNotYoursException}); missing order → 404 ({@code
     * OrderNotFoundException}); wrong status (not {@code placed}/{@code accepted}) → 409 {@code
     * InvalidOrderTransitionException}; past {@code cutoffAt} → 409 {@code CutoffPassedException}.
     * Restores stock + frees the slot spot through {@code transition}.
     */
    OrderDetailResource cancel(long userId, long orderId);

    /**
     * {@code PUT /orders/{id}/items} (FR-035) — change quantities or drop items, never add a new
     * product (D-07, {@code ProductNotInOrderException} 400 if it tries); stock changes by exactly
     * the difference. An {@code accepted} order goes back to {@code placed} for the Farmer to
     * review again; a {@code placed} order keeps its status and writes no history. Dropping every
     * item = cancelling the order.
     */
    OrderDetailResource modifyItems(long userId, long orderId, ModifyOrderRequest request);

    /**
     * FR-037 — the lines of an old order as a suggested cart: products that can no longer be bought
     * drop out and quantities are capped at current stock. Creates nothing.
     */
    List<CartLine> reorder(long userId, long orderId);

    /**
     * FR-039 — completes one order that is still {@code ready} (system actor, no notification).
     * Returns false when the order is gone or no longer ready.
     */
    boolean autoComplete(long orderId);
}
