package com.techx.intervue.modules.order.services.interfaces;

import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource;
import com.techx.intervue.modules.order.resources.PlacedOrderResource;
import java.util.List;

/** FR-030…032 — preview the cart split by stall and place the order (contract §7). */
public interface OrderServiceInterface {

    /** Read-only: no locking, changes nothing. Each group's issues live in {@code problems}. */
    List<OrderGroupPreviewResource> preview(Long userIdOrNull, PreviewRequest request);

    /**
     * One transaction: every order of the call is created, stock and slots are deducted — or
     * nothing happens at all.
     */
    List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request);
}
