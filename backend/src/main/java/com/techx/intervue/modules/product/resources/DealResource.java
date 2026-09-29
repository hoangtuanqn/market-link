package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;
import java.util.List;

public record DealResource(
        Long productId,
        String name,
        String imageUrl,
        String unit,
        String stallName,
        Long farmerId,
        List<String> marketNames,
        String stockDate,
        BigDecimal listPrice,
        BigDecimal unitPrice,
        int discountPercent,
        String bestBefore,
        int daysLeft,
        int quantityAvailable,
        String storageMode) {}
