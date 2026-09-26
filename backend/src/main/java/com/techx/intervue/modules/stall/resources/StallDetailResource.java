package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * GET /farmers/{id} and GET /farmer/profile (contract §4). `approvalStatus` only matters to the
 * Farmer themself — the public page only sees approved stalls (D-09).
 */
public record StallDetailResource(
        Long farmerId,
        String stallName,
        String contactPerson,
        String description,
        String logoUrl,
        int orderCutoffHours,
        BigDecimal ratingAvg,
        int ratingCount,
        String approvalStatus,
        List<StallMarketResource> markets) {}
