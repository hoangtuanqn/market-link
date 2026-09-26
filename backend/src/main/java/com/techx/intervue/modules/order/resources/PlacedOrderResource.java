package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/**
 * An order that was just created. {@code cutoffAt} is ISO 8601 UTC ("2026-09-28T12:00:00Z") per the
 * contract.
 */
public record PlacedOrderResource(
        Long orderId, String orderCode, String status, String cutoffAt, BigDecimal totalAmount) {}
