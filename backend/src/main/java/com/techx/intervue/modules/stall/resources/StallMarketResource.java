package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

/** Một chợ mà stall đang bán, kèm quầy và khung giờ theo thứ (contract §4 `markets[]`). */
public record StallMarketResource(
        Long farmerMarketId,
        Long marketId,
        String marketName,
        String stallCode,
        BigDecimal stallLatitude,
        BigDecimal stallLongitude,
        List<OperatingDayResource> operatingDays) {}
