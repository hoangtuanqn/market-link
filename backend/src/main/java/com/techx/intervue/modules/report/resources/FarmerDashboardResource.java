package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

public record FarmerDashboardResource(
        long totalOrders,
        long pendingOrders,
        BigDecimal revenueTotal,
        BigDecimal revenueThisMonth,
        long completedOrders,
        long productCount,
        long lowStockCount) {

    public FarmerDashboardResource withLowStockCount(long count) {
        return new FarmerDashboardResource(
                totalOrders,
                pendingOrders,
                revenueTotal,
                revenueThisMonth,
                completedOrders,
                productCount,
                count);
    }
}
