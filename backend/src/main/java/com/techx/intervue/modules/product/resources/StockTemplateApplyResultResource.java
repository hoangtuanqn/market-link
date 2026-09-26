package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

/** Một product vừa được nạp lại tồn kho bởi POST /api/v1/farmer/stock-templates/apply. */
public record StockTemplateApplyResultResource(
        Long productId, String productName, int stockQuantity, BigDecimal price, String status) {}
