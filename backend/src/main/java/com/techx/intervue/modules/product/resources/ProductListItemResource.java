package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

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
        int shelfLifeDays,
        String availableDate) {

    public ProductListItemResource withAvailability(
            int stockQuantity, BigDecimal price, String availableDate) {
        return new ProductListItemResource(
                id,
                name,
                farmerId,
                stallName,
                marketId,
                marketName,
                categoryId,
                categoryName,
                price,
                unit,
                stockQuantity,
                imageUrl,
                status,
                ratingAvg,
                ratingCount,
                shelfLifeDays,
                availableDate);
    }
}
