package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

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
