package com.techx.intervue.modules.order.services.interfaces;

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

/** FR-030…032, 033, 036, 065 — giỏ, đặt đơn, và đọc đơn cho cả hai phía (contract §7). */
public interface OrderServiceInterface {

    /** Chỉ đọc: không khoá, không đổi gì. Vấn đề của từng group nằm trong {@code problems}. */
    List<OrderGroupPreviewResource> preview(Long userIdOrNull, PreviewRequest request);

    /** Một transaction: mọi đơn của lệnh được tạo, tồn kho và slot trừ xong — hoặc không gì cả. */
    List<PlacedOrderResource> place(long customerUserId, PlaceOrderRequest request);

    /** {@code GET /orders} — đơn của chính người gọi với vai buyer, mới nhất trước. */
    PageResource<OrderListItemResource> myOrders(
            long userId, String status, int page, int pageSize);

    /**
     * {@code GET /orders/{id}} — buyer hoặc Farmer của đơn mới đọc được (R-06, Review focus #3);
     * còn lại {@code OrderNotYoursException} (403), đơn không tồn tại thì {@code
     * OrderNotFoundException} (404).
     */
    OrderDetailResource detail(long userId, long orderId);

    /** {@code GET /farmer/orders} — đơn đặt tại sạp của chính Farmer, theo giờ nhận hàng. */
    PageResource<OrderListItemResource> farmerOrders(
            long userId, String status, LocalDate date, int page, int pageSize);

    /**
     * {@code PATCH /farmer/orders/{id}/accept} (FR-065) — {@code placed → accepted}. Sai chủ (kể cả
     * tài khoản không có {@code farmer_profiles}) → {@code OrderNotYoursException} (403); đơn không
     * tồn tại → {@code OrderNotFoundException} (404); sai thứ tự → {@code
     * InvalidOrderTransitionException} (409, D-04).
     */
    OrderDetailResource accept(long userId, long orderId);

    /**
     * {@code PATCH /farmer/orders/{id}/decline} (FR-065, FR-066) — {@code placed/accepted →
     * declined}: hoàn tồn kho và trả chỗ slot (D-02), ghi {@code reason} vào {@code farmer_note}.
     */
    OrderDetailResource decline(long userId, long orderId, String reason);

    /** {@code PATCH /farmer/orders/{id}/ready} — {@code accepted → ready}. */
    OrderDetailResource markReady(long userId, long orderId);

    /**
     * {@code PATCH /farmer/orders/{id}/complete} — {@code ready → completed}; không hoàn tồn kho.
     */
    OrderDetailResource complete(long userId, long orderId);

    /**
     * {@code PATCH /orders/{id}/cancel} (FR-034) — chỉ khách mua ({@code customer_id}) mới huỷ được
     * (403 nếu không, {@code OrderNotYoursException}); đơn không tồn tại → 404 ({@code
     * OrderNotFoundException}); sai trạng thái ({@code placed}/{@code accepted}) → 409 {@code
     * InvalidOrderTransitionException}; quá {@code cutoffAt} → 409 {@code CutoffPassedException}.
     * Hoàn tồn kho + trả chỗ slot qua {@code transition}.
     */
    OrderDetailResource cancel(long userId, long orderId);

    /**
     * {@code PUT /orders/{id}/items} (FR-035) — sửa số lượng hoặc bỏ item, không bao giờ thêm sản
     * phẩm mới (D-07, {@code ProductNotInOrderException} 400 nếu có); tồn kho đổi đúng phần chênh
     * lệch. Đơn {@code accepted} quay về {@code placed} để Farmer duyệt lại; đơn {@code placed} giữ
     * nguyên trạng thái, không ghi lịch sử. Bỏ hết item = huỷ đơn.
     */
    OrderDetailResource modifyItems(long userId, long orderId, ModifyOrderRequest request);
}
