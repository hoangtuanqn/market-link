package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record DealRequest(
        @NotNull(message = "Enter how much you bring.")
                @Min(value = 1, message = "Bring at least 1.")
                Integer quantityAvailable,
        @NotNull(message = "Enter the harvest or packing date.") LocalDate packedOn,
        @NotNull(message = "Choose a discount.") Integer discountPercent) {}
