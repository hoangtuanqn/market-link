package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/**
 * One line of a preview group. {@code status} is the real sellable state: a product that is hidden
 * or deleted shows {@code unavailable} even though its status column is still {@code available}.
 */
public record PreviewItemResource(
        Long productId,
        String name,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal,
        int stockQuantity,
        String status) {}
