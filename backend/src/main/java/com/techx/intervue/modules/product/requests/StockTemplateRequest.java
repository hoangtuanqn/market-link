package com.techx.intervue.modules.product.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/**
 * PUT /farmer/stock-templates — the stall's whole set of templates; an empty list clears it
 * (contract §5).
 */
public record StockTemplateRequest(@NotNull @Valid List<TemplateItem> items) {

    /** dayOfWeek: 0 = Sunday … 6 = Saturday. defaultPrice null = keep the product's price. */
    public record TemplateItem(
            @NotNull Long productId,
            @NotNull @Min(0) @Max(6) Integer dayOfWeek,
            @NotNull @Min(0) @Max(100000) Integer defaultQuantity,
            @DecimalMin("0") BigDecimal defaultPrice) {}
}
