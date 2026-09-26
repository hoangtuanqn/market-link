package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;

/**
 * One product in the list (contract §5). `marketId`/`marketName` is the market being filtered, or
 * one market of the stall when not filtering — the full details of all markets are at `GET
 * /farmers/{id}`.
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
