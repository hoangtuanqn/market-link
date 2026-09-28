package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/**
 * One row of an order list — the customer's ({@code GET /orders}) or the Farmer's ({@code GET
 * /farmer/orders}), contract §7. Dates "yyyy-MM-dd", times "HH:mm"; {@code cutoffAt}/{@code
 * createdAt} are ISO 8601 UTC ("2026-09-28T12:00:00Z", C5-15). {@code reviewed} (FR-033, FR-050):
 * the order already carries at least one review, so the customer's list does not offer "Review"
 * again; read in the same statement as the list, appended last so positional readers keep working.
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
        String createdAt,
        Long customerId,
        String customerName,
        boolean reviewed) {}
