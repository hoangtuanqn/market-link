package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

/** {@code GET /admin/reports/revenue} (FR-075): completed orders per market. */
public record RevenueByMarketResource(
        Long marketId, String marketName, long orderCount, BigDecimal revenue) {}
