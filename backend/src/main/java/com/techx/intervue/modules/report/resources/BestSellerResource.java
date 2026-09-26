package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

/** {@code GET /farmer/reports/best-sellers} (FR-069): one product, summed over completed orders. */
public record BestSellerResource(
        Long productId, String name, long quantitySold, BigDecimal revenue) {}
