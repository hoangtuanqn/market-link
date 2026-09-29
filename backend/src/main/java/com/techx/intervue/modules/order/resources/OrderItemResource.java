package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

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
