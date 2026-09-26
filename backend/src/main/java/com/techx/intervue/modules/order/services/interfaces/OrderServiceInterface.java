package com.techx.intervue.modules.order.services.interfaces;

import com.techx.intervue.modules.order.requests.PlaceOrderRequest;
import com.techx.intervue.modules.order.requests.PreviewRequest;
import com.techx.intervue.modules.order.resources.OrderGroupPreviewResource;
import com.techx.intervue.modules.order.resources.PlacedOrderResource;
import java.util.List;

/** FR-030…032 — xem trước giỏ tách theo stall và đặt đơn (contract §7). */
public interface OrderServiceInterface {

    /** Chỉ đọc: không khoá, không đổi gì. Vấn đề của từng group nằm trong {@code problems}. */
    List<OrderGroupPreviewResource> preview(Long userIdOrNull, PreviewRequest request);

    /** Một transaction: mọi đơn của lệnh được tạo, tồn kho và slot trừ xong — hoặc không gì cả. */
    List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request);
}
