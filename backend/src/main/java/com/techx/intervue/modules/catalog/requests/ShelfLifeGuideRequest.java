package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ShelfLifeGuideRequest(
        @NotNull(message = "Choose a category.") Long categoryId,
        @NotBlank(message = "Give the group a name.")
                @Size(max = 80, message = "Keep the group name to 80 characters or fewer.")
                String groupName,
        @Size(max = 255, message = "Keep the examples to 255 characters or fewer.") String examples,
        @NotBlank(message = "Choose how it is kept.")
                @Pattern(regexp = "room|chilled", message = "Choose room or chilled.")
                String storageMode,
        @NotNull(message = "Enter the suggested number of days.")
                @Min(value = 1, message = "Enter a whole number from 1 to 365.")
                @Max(value = 365, message = "Enter a whole number from 1 to 365.")
                Integer suggestedDays,
        Boolean active) {}
