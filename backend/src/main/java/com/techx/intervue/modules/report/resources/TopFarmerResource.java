package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

public record TopFarmerResource(
        Long farmerId,
        String stallName,
        long orderCount,
        BigDecimal revenue,
        BigDecimal ratingAvg) {}
