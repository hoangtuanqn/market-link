package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

/**
 * {@code GET /farmer/dashboard} (FR-068): Total Orders, Pending Orders (= {@code placed}, still
 * waiting for the stall), Revenue Summary (completed orders only). {@code lowStockCount} counts
 * available products whose nearest pickup date with stock has 5 units or fewer left, or that no
 * weekly template makes orderable at all (per-date stock, FR-063).
 */
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
