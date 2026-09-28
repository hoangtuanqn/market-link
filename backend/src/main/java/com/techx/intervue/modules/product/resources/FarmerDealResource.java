package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

/**
 * One deal day of the Farmer's own stall (GET /api/v1/farmer/deals, FR-124). Dates are
 * "yyyy-MM-dd"; {@code daysLeft} counts the pickup day itself.
 */
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
