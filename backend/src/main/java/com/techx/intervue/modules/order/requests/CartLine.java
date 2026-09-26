package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Một dòng giỏ hàng: sản phẩm và số lượng (contract §7). */
public record CartLine(@NotNull Long productId, @NotNull @Min(1) Integer quantity) {}
