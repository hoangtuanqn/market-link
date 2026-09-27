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
        int shelfLifeDays) {

    /**
     * Overwrites {@code stockQuantity}/{@code price} with the numbers for the nearest orderable
     * pickup date (contract §5, FR-063 daily stock). Used only on public/preview pages, never on
     * {@code mine()} — a Farmer editing their own product needs the raw reference values, not a
     * date-scoped number.
     */
    public ProductListItemResource withAvailability(int stockQuantity, BigDecimal price) {
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
                shelfLifeDays);
    }
}
