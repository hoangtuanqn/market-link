package com.techx.intervue.modules.catalog.resources;

import com.techx.intervue.modules.geo.resources.AddressPartsResource;
import java.math.BigDecimal;
import java.util.List;

public record MarketResource(
        Long id,
        String marketName,
        String address,
        AddressPartsResource addressParts,
        String wardName,
        String provinceName,
        BigDecimal latitude,
        BigDecimal longitude,
        String mapProvider,
        String openingTime,
        String closingTime,
        List<String> images,
        List<Integer> operatingDays,
        long farmerCount) {}
