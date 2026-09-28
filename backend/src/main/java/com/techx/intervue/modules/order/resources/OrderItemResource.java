package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/**
 * One {@code order_items} line — name/price/unit as copied at order time (contract §7). {@code
 * bestBefore} ("yyyy-MM-dd") and {@code storageMode} are the shelf-life promise (FR-121), null on
 * lines placed before it existed; {@code listPrice} is the price before a near-expiry discount
 * (FR-124), null when there was none. {@code qualityReport} is the customer's spoilage report on
 * this line, null until reported, and {@code itemId} is order_items.id — the {itemId} of POST
 * /orders/{id}/items/{itemId}/quality-report (FR-122).
 */
public record OrderItemResource(
        Long productId,
        String productName,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal,
        String bestBefore,
        String storageMode,
        BigDecimal listPrice,
        ItemQualityReportResource qualityReport,
        Long itemId) {}
