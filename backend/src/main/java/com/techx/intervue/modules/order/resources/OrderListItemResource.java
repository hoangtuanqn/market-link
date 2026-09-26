package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/**
 * Một dòng trong danh sách đơn — của khách ({@code GET /orders}) hoặc của Farmer ({@code GET
 * /farmer/orders}), contract §7. Ngày "yyyy-MM-dd", giờ "HH:mm"; {@code cutoffAt}/{@code createdAt}
 * là ISO 8601 UTC ("2026-09-28T12:00:00Z", C5-15).
 */
public record OrderListItemResource(
        Long orderId,
        String orderCode,
        String status,
        Long farmerId,
        String stallName,
        Long marketId,
        String marketName,
        String pickupDate,
        String pickupStart,
        String pickupEnd,
        String cutoffAt,
        BigDecimal totalAmount,
        int itemCount,
        String createdAt) {}
