package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CartLine(@NotNull Long productId, @NotNull @Min(1) Integer quantity) {}
