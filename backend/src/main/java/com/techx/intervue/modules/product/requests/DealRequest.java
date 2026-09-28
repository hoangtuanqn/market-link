package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * Body of PUT /api/v1/farmer/products/{id}/daily-stock/{date}/deal (FR-124): how much the stall
 * brings for that day, when that batch was harvested or packed, and the discount. The discount
 * steps and the batch rules are checked by DealPolicy in the service, so each error names its
 * field.
 */
public record DealRequest(
        @NotNull(message = "Enter how much you bring.")
                @Min(value = 1, message = "Bring at least 1.")
                Integer quantityAvailable,
        @NotNull(message = "Enter the harvest or packing date.") LocalDate packedOn,
        @NotNull(message = "Choose a discount.") Integer discountPercent) {}
