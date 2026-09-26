package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body của PATCH /api/v1/admin/products/{id}/hide (FR-074). Farmer thấy lý do này trong danh sách
 * của mình.
 */
public record HideProductRequest(
        @NotBlank(message = "Give the stall a reason.") @Size(max = 255) String reason) {}
