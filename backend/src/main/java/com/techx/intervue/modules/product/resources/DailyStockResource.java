package com.techx.intervue.modules.product.resources;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A single product_daily_stock row: after a Farmer's per-date override, after a near-expiry deal
 * (FR-124), or as one pickup day the deal dialog offers. The four deal fields are null when the day
 * has no deal.
 */
public record DailyStockResource(
        Long productId,
        LocalDate stockDate,
        int quantityAvailable,
        BigDecimal unitPrice,
        BigDecimal listPrice,
        Integer discountPercent,
        LocalDate packedOn,
        LocalDate bestBefore) {

    public static DailyStockResource of(ProductDailyStock row) {
        return new DailyStockResource(
                row.getProductId(),
                row.getStockDate(),
                row.getQuantityAvailable(),
                row.getUnitPrice(),
                row.getListPrice(),
                row.getDiscountPercent(),
                row.getPackedOn(),
                row.getBestBefore());
    }
}
