package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HideProductRequest(
        @NotBlank(message = "Give the stall a reason.") @Size(max = 255) String reason) {}
