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

public interface OrderServiceInterface {

    List<OrderGroupPreviewResource> preview(Long userIdOrNull, PreviewRequest request);

    List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request);

    PageResource<OrderListItemResource> myOrders(
            long userId, String status, int page, int pageSize);

    OrderDetailResource detail(long userId, long orderId);

    PageResource<OrderListItemResource> farmerOrders(
            long userId, String status, LocalDate date, int page, int pageSize);

    OrderDetailResource accept(long userId, long orderId);

    OrderDetailResource decline(long userId, long orderId, String reason);

    OrderDetailResource markReady(long userId, long orderId);

    OrderDetailResource complete(long userId, long orderId);

    OrderDetailResource cancel(long userId, long orderId);

    OrderDetailResource modifyItems(long userId, long orderId, ModifyOrderRequest request);

    List<CartLine> reorder(long userId, long orderId);

    boolean autoComplete(long orderId);

    void cancelAllForDeactivatedCustomer(long customerId, Long adminActorId);
}
