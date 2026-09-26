package com.techx.intervue.modules.catalog.resources;

import java.math.BigDecimal;
import java.util.List;

/** Một chợ như contract §3 trả về: giờ "HH:mm", operatingDays 0…6, farmerCount = stall đã duyệt. */
public record MarketResource(
        Long id,
        String marketName,
        String address,
        String district,
        String city,
        BigDecimal latitude,
        BigDecimal longitude,
        String mapProvider,
        String openingTime,
        String closingTime,
        List<String> images,
        List<Integer> operatingDays,
        long farmerCount) {}
