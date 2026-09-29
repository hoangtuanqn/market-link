package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "Category name is required.")
                @Size(max = 80, message = "Keep the category name to 80 characters or fewer.")
                String name,
        @PositiveOrZero int sortOrder,
        @NotNull(message = "Minimum shelf life is required.") @Positive Integer minShelfLifeDays,
        @NotNull(message = "Maximum shelf life is required.") @Positive Integer maxShelfLifeDays) {}
