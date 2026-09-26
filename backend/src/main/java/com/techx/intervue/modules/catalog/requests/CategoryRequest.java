package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Body của POST/PUT /api/v1/admin/categories (contract §5). Slug do server sinh từ name. */
public record CategoryRequest(
        @NotBlank(message = "Category name is required.") @Size(max = 80) String name,
        @Size(max = 255) String description,
        @Size(max = 50) String icon,
        @PositiveOrZero int sortOrder) {}
