package com.techx.intervue.modules.favorite.resources;

public record FavoriteResource(
        Long id,
        String targetType,
        Long targetId,
        String title,
        String subtitle,
        String imageUrl,
        boolean available) {}
