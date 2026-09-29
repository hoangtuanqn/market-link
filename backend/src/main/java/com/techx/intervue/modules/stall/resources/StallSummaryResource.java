package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

public record StallSummaryResource(
        Long farmerId,
        String stallName,
        String contactPerson,
        String logoUrl,
        String stallCode,
        BigDecimal stallLatitude,
        BigDecimal stallLongitude,
        BigDecimal ratingAvg,
        int ratingCount,
        List<Integer> operatingDays,
        String pickupStartTime,
        String pickupEndTime) {}
