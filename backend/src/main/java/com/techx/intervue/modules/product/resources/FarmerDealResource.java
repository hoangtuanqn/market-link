package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

public record FarmerDealResource(
        Long productId,
        String productName,
        String unit,
        String stockDate,
        int quantityAvailable,
        BigDecimal listPrice,
        BigDecimal unitPrice,
        int discountPercent,
        String packedOn,
        String bestBefore,
        int daysLeft) {}
