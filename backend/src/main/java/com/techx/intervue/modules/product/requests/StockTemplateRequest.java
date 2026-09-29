package com.techx.intervue.modules.product.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;

public record StockTemplateRequest(@NotNull @Valid List<Item> items) {

    public record Item(
            @NotNull Long productId,
            @Min(0) @Max(6) int dayOfWeek,
            @NotNull @Min(0) Integer defaultQuantity,
            @Positive(message = "Price must be greater than 0.") BigDecimal defaultPrice) {}
}
