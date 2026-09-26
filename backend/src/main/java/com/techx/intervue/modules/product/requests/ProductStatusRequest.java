package com.techx.intervue.modules.product.requests;

import com.techx.intervue.modules.product.enums.ProductStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Body của PATCH /api/v1/farmer/products/{id}/status — `available` | `sold_out` | `unavailable`
 * (FR-064).
 */
public record ProductStatusRequest(
        @NotNull(message = "Status is required.") ProductStatus status) {}
