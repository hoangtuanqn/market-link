package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

/** One saved template row, with the product name and unit the stock grid shows. */
public record StockTemplateItemResource(
        Long productId,
        String productName,
        String unit,
        int dayOfWeek,
        int defaultQuantity,
        BigDecimal defaultPrice) {}
