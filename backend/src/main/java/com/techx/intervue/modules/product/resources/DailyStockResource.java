package com.techx.intervue.modules.product.resources;

import java.math.BigDecimal;
import java.time.LocalDate;

/** A single product_daily_stock row, after a Farmer's per-date override. */
public record DailyStockResource(
        Long productId, LocalDate stockDate, int quantityAvailable, BigDecimal unitPrice) {}
