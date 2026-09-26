package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

/** {@code GET /admin/dashboard} (FR-070, contract §10). {@code totalFarmers} = approved stalls. */
public record AdminDashboardResource(
        long totalFarmers,
        long totalCustomers,
        long totalMarkets,
        long totalOrders,
        BigDecimal revenueTotal,
        long pendingFarmers,
        long hiddenListings) {}
