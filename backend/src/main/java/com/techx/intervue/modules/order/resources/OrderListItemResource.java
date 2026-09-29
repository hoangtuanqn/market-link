package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

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
