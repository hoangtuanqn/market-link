package com.techx.intervue.modules.product.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;

/**
 * Body of PUT /api/v1/farmer/stock-templates (contract §5, FR-063) — replaces the whole weekly
 * schedule.
 */
public record StockTemplateRequest(@NotNull @Valid List<Item> items) {

    /**
     * 0 = Sunday … 6 = Saturday. {@code defaultPrice} null keeps the product's current price; when
     * given it must be above 0, like the product price and a one-day adjustment.
     */
    public record Item(
            @NotNull Long productId,
            @Min(0) @Max(6) int dayOfWeek,
            @NotNull @Min(0) Integer defaultQuantity,
            @Positive(message = "Price must be greater than 0.") BigDecimal defaultPrice) {}
}
