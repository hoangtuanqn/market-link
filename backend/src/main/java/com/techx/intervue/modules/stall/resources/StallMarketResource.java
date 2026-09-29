package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

public record StallMarketResource(
        Long farmerMarketId,
        Long marketId,
        String marketName,
        String stallCode,
        BigDecimal stallLatitude,
        BigDecimal stallLongitude,
        List<OperatingDayResource> operatingDays) {}
