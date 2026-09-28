package com.techx.intervue.modules.quality.resources;

import java.time.Instant;

/**
 * FR-122, FR-123: one spoilage report as the stall and the admin read it. Dates are "yyyy-MM-dd";
 * {@code …At} are instants. {@code stallStatus} is the stall's approval status (the admin's
 * "Suspend stall" button needs {@code approved}); {@code stallActiveStrikes} counts the stall's
 * strikes of the last 90 days.
 */
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
