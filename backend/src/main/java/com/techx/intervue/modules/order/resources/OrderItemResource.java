package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/** One {@code order_items} line — name/price/unit as copied at order time (contract §7). */
public record OrderItemResource(
        Long productId,
        String productName,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal) {}
