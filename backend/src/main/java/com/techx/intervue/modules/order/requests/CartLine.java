package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** One cart line: a product and a quantity (contract §7). */
public record CartLine(@NotNull Long productId, @NotNull @Min(1) Integer quantity) {}
