package com.techx.intervue.modules.order.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * {@code GET /orders/{id}} (contract §7, FR-033/036/065). {@code customer} chỉ có mặt khi người gọi
 * là Farmer của chính đơn này — controller ruling C5-16: khi không phải, key {@code customer} VẮNG
 * khỏi JSON hoàn toàn (không phải {@code "customer": null}). {@code @JsonInclude} chỉ đặt trên
 * component này (precedent: {@code MessageResource}), không đặt trên cả record — {@code
 * customerNote}/{@code farmerNote} vẫn phải xuất hiện là {@code null} như bình thường.
 */
public record OrderDetailResource(
        OrderListItemResource summary,
        List<OrderItemResource> items,
        List<OrderHistoryResource> statusHistory,
        boolean canCancel,
        boolean canModify,
        String customerNote,
        String farmerNote,
        @JsonInclude(JsonInclude.Include.NON_NULL) CustomerSummaryResource customer) {}
