package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of PATCH /api/v1/admin/products/{id}/hide (FR-074). The Farmer sees this reason in their own
 * list.
 */
public record HideProductRequest(
        @NotBlank(message = "Give the stall a reason.") @Size(max = 255) String reason) {}
