package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

/**
 * {@code GET /admin/reports/top-products} (FR-075): one product, summed over every stall's {@code
 * completed} orders.
 */
public record TopProductResource(
        Long productId,
        String name,
        String stallName,
        String unit,
        BigDecimal unitPrice,
        long quantitySold,
        BigDecimal revenue) {}
