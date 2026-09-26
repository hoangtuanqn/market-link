package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Body of POST/PUT /api/v1/admin/categories (contract §5). The server generates the slug from name.
 * `minShelfLifeDays`/`maxShelfLifeDays` are the standard shelf-life range the Admin sets for this
 * category — no official FR yet, see migration V20260926015.
 */
public record CategoryRequest(
        @NotBlank(message = "Category name is required.") @Size(max = 80) String name,
        @PositiveOrZero int sortOrder,
        @NotNull(message = "Minimum shelf life is required.") @Positive Integer minShelfLifeDays,
        @NotNull(message = "Maximum shelf life is required.") @Positive Integer maxShelfLifeDays) {}
