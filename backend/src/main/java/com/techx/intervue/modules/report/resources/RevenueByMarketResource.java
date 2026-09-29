package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

public record RevenueByMarketResource(
        Long marketId, String marketName, long orderCount, BigDecimal revenue) {}
