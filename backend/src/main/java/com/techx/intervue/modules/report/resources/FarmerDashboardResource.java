package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

/**
 * {@code GET /farmer/dashboard} (FR-068): Total Orders, Pending Orders (= {@code placed}, still
 * waiting for the stall), Revenue Summary (completed orders only). {@code lowStockCount} counts
 * available products at or under 5 units.
 */
public record FarmerDashboardResource(
        long totalOrders,
        long pendingOrders,
        BigDecimal revenueTotal,
        BigDecimal revenueThisMonth,
        long completedOrders,
        long productCount,
        long lowStockCount) {}
