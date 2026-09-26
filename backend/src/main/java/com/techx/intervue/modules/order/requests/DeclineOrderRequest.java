package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * FR-065: a Farmer declining an order must give a reason — it is copied into {@code
 * orders.farmer_note} for the customer to read (contract §7). Empty or whitespace only → 400
 * VALIDATION_ERROR on field {@code reason}, blocked here by {@code @Valid} in the controller, not
 * in the service.
 */
public record DeclineOrderRequest(
        @NotBlank(message = "Enter a reason.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason) {}
