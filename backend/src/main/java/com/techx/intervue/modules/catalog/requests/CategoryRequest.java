package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Body của POST/PUT /api/v1/admin/categories (contract §5). Slug do server sinh từ name.
 * `minShelfLifeDays`/`maxShelfLifeDays` là khoảng ngày tươi chuẩn Admin chốt cho category này —
 * chưa có FR chính thức, xem migration V20260926015.
 */
public record CategoryRequest(
        @NotBlank(message = "Category name is required.") @Size(max = 80) String name,
        @PositiveOrZero int sortOrder,
        @NotNull(message = "Minimum shelf life is required.") @Positive Integer minShelfLifeDays,
        @NotNull(message = "Maximum shelf life is required.") @Positive Integer maxShelfLifeDays) {}
