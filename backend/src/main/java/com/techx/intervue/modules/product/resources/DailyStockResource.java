package com.techx.intervue.modules.product.resources;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import java.math.BigDecimal;
import java.time.LocalDate;

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
