package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * One product on a near-expiry deal for one pickup day (GET /api/v1/deals, spec §4.5.4). Dates are
 * "yyyy-MM-dd"; {@code marketNames} are the markets the stall is at on that weekday; {@code
 * daysLeft} counts the pickup day itself.
 */
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
