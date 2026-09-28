package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Body of POST/PUT /api/v1/farmer/products (contract §5, FR-062, FR-121). {@code shelfLifeGuideId}
 * is required once the category has storage groups; {@code storageMode} null means room temperature
 * when there is no group. A shelf life longer than the suggestion needs {@code
 * acknowledgeLongerShelfLife = true}.
 */
public record ProductRequest(
        @NotNull(message = "Category is required.") Long categoryId,
        @NotBlank(message = "Product name is required.") @Size(max = 150) String name,
        @Size(max = 2000) String description,
        @NotNull(message = "Price is required.") @DecimalMin("0") BigDecimal price,
        @NotBlank(message = "Unit is required.") @Size(max = 20) String unit,
        @NotNull(message = "Quantity is required.") @Min(0) Integer stockQuantity,
        @Size(max = 255) String imageUrl,
        @NotNull(message = "Shelf life is required.") @Positive Integer shelfLifeDays,
        Long shelfLifeGuideId,
        @Pattern(regexp = "room|chilled", message = "Choose room or chilled.") String storageMode,
        Boolean acknowledgeLongerShelfLife) {}
