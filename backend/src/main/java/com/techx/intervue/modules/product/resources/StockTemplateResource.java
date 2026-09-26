package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

/**
 * Một dòng lịch tồn kho tuần, trả về từ GET /api/v1/farmer/stock-templates (contract §5, FR-063).
 */
public record StockTemplateResource(
        Long productId,
        String productName,
        int dayOfWeek,
        int defaultQuantity,
        BigDecimal defaultPrice) {}
