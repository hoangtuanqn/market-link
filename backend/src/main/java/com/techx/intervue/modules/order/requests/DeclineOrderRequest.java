package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeclineOrderRequest(
        @NotBlank(message = "Enter a reason.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason) {}
