package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

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
