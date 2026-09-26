package com.techx.intervue.modules.favorite.requests;

import jakarta.validation.constraints.NotBlank;

/**
 * POST /favorites — { targetType, farmerId?, productId?, marketId? } (contract §9): send exactly
 * the id that matches targetType.
 */
public record FavoriteRequest(
        @NotBlank String targetType, Long farmerId, Long productId, Long marketId) {}
