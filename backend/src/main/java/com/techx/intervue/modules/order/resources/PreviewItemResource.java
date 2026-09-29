package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/**
 * One line of a preview group. {@code status} is the real sellable state: a product that is hidden
 * or deleted shows {@code unavailable} even though its status column is still {@code available}.
 * The last four describe the day the line is priced for (FR-125): {@code listPrice} and {@code
 * discountPercent} only when that day is on a near-expiry deal; {@code bestBefore} ("yyyy-MM-dd")
 * is that deal batch's last good day, else the pickup day plus the shelf life, null when no day
 * applies; {@code storageMode} is how the product is kept.
 */
public record PreviewItemResource(
        Long productId,
        String name,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal,
        int stockQuantity,
        String status,
        BigDecimal listPrice,
        Integer discountPercent,
        String bestBefore,
        String storageMode) {}
