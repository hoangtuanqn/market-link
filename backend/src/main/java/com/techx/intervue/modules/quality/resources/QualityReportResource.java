package com.techx.intervue.modules.quality.resources;

import java.time.Instant;

public record QualityReportResource(
        Long id,
        Long orderId,
        String orderCode,
        Long farmerId,
        String stallName,
        String stallStatus,
        String customerName,
        Long productId,
        String productName,
        String pickupDate,
        String bestBefore,
        String storageMode,
        String spoiledOn,
        boolean beforePromise,
        String problem,
        String note,
        String photoUrl,
        boolean shelfLifeExtended,
        int extendedByDays,
        String status,
        String farmerResponse,
        Instant farmerRespondedAt,
        String decisionNote,
        Instant decidedAt,
        Instant createdAt,
        int stallActiveStrikes) {}
