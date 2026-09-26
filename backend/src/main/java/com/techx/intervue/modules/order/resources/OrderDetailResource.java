package com.techx.intervue.modules.order.resources;

import java.util.List;

/**
 * {@code GET /orders/{id}} (contract §7, FR-033/036/065). {@code customer} chỉ có mặt (khác {@code
 * null}) khi người gọi là Farmer của chính đơn này; khách xem đơn của mình thấy {@code null} (quyết
 * định: field luôn có mặt trong JSON, giá trị {@code null} khi không áp dụng — không lược bỏ
 * field).
 */
public record OrderDetailResource(
        OrderListItemResource summary,
        List<OrderItemResource> items,
        List<OrderHistoryResource> statusHistory,
        boolean canCancel,
        boolean canModify,
        String customerNote,
        String farmerNote,
        CustomerSummaryResource customer) {}
