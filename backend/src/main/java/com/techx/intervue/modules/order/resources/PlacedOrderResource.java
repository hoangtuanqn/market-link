package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

public record PlacedOrderResource(
        Long orderId, String orderCode, String status, String cutoffAt, BigDecimal totalAmount) {}
