package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/** Một đơn vừa tạo. {@code cutoffAt} là ISO 8601 UTC ("2026-09-28T12:00:00Z") như contract. */
public record PlacedOrderResource(
        Long orderId, String orderCode, String status, String cutoffAt, BigDecimal totalAmount) {}
