package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * One stall in a market's list or a Farmer search result (contract §4). When filtering by market,
 * the booth and time window are those of that market; without filtering the stall's first market is
 * used. The stall card on the market page needs the contact person and the pickup time window, so
 * those two come along instead of making the FE call one more request per card.
 */
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
