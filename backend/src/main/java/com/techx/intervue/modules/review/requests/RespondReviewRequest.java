package com.techx.intervue.modules.review.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code POST /farmer/reviews/{id}/response} (contract §8). */
public record RespondReviewRequest(@NotBlank @Size(max = 2000) String responseText) {}
