package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

/** {@code GET /admin/reports/top-farmers} (FR-075): stalls by completed revenue, highest first. */
public record TopFarmerResource(
        Long farmerId,
        String stallName,
        long orderCount,
        BigDecimal revenue,
        BigDecimal ratingAvg) {}
