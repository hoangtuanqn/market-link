package com.techx.intervue.modules.product.requests;

import com.techx.intervue.modules.product.enums.ProductStatus;
import jakarta.validation.constraints.NotNull;

public record ProductStatusRequest(
        @NotNull(message = "Status is required.") ProductStatus status) {}
