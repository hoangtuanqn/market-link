package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

/**
 * Một sản phẩm trong danh sách (contract §5). `marketId`/`marketName` là chợ đang lọc, hoặc một chợ
 * của stall khi không lọc — chi tiết đầy đủ các chợ nằm ở `GET /farmers/{id}`.
 */
public record ProductListItemResource(
        Long id,
        String name,
        Long farmerId,
        String stallName,
        Long marketId,
        String marketName,
        Long categoryId,
        String categoryName,
        BigDecimal price,
        String unit,
        int stockQuantity,
        String imageUrl,
        String status,
        BigDecimal ratingAvg,
        int ratingCount,
        int shelfLifeDays) {}
