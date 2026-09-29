package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

public record StockTemplateResource(
        Long productId,
        String productName,
        int dayOfWeek,
        int defaultQuantity,
        BigDecimal defaultPrice) {}
