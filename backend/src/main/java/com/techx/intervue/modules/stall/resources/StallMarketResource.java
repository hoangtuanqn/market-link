package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * One market a stall sells at, with the booth and time windows by weekday (contract §4
 * `markets[]`).
 */
public record StallMarketResource(
        Long farmerMarketId,
        Long marketId,
        String marketName,
        String stallCode,
        BigDecimal stallLatitude,
        BigDecimal stallLongitude,
        List<OperatingDayResource> operatingDays) {}
