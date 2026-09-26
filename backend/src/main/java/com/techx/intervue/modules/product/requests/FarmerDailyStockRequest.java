package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Body of PATCH /api/v1/farmer/products/{id}/daily-stock/{date} — adjusts one date without touching
 * the recurring template. {@code unitPrice} null keeps that date's existing price.
 */
public record FarmerDailyStockRequest(
        @NotNull @Min(0) Integer quantityAvailable, @DecimalMin("0") BigDecimal unitPrice) {}
