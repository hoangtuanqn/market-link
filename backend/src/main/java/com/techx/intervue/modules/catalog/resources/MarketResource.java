package com.techx.intervue.modules.catalog.resources;

import com.techx.intervue.modules.geo.resources.AddressPartsResource;
import java.math.BigDecimal;
import java.util.List;

/**
 * A market as returned by contract §3: times "HH:mm", operatingDays 0…6, farmerCount = approved
 * stalls.
 */
public record MarketResource(
        Long id,
        String marketName,
        String address,
        AddressPartsResource addressParts,
        /* the ward and province names, so a screen can show the area without the geo lists */
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
