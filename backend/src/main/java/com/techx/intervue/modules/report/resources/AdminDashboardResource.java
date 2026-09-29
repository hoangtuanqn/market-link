package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

public record AdminDashboardResource(
        long totalFarmers,
        long totalCustomers,
        long totalMarkets,
        long totalOrders,
        BigDecimal revenueTotal,
        long pendingFarmers,
        long hiddenListings) {}
