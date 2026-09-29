package com.techx.intervue.modules.favorite.requests;

import jakarta.validation.constraints.NotBlank;

public record FavoriteRequest(
        @NotBlank String targetType, Long farmerId, Long productId, Long marketId) {}
