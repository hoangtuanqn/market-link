package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record FarmerDailyStockRequest(
        @NotNull @Min(0) Integer quantityAvailable,
        @Positive(message = "Price must be greater than 0.") BigDecimal unitPrice) {}
