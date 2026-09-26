package com.techx.intervue.modules.review.requests;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /reviews} (contract §8). {@code targetType} is {@code "product"} (then {@code
 * productId}) or {@code "farmer"} (then {@code farmerId} = farmer_profiles.id).
 */
public record CreateReviewRequest(
        @NotNull Long orderId,
        @NotBlank String targetType,
        Long productId,
        Long farmerId,
        @NotNull @Min(1) @Max(5) Integer rating,
        @Size(max = 2000) String comment) {}
