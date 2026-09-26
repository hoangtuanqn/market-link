package com.techx.intervue.modules.favorite.resources;

/**
 * One favourite as the Favorites screen shows it. {@code available} is false when the target can no
 * longer be bought or visited (sold out, paused, hidden, deleted, suspended stall, closed market) —
 * the row still shows, dimmed.
 */
public record FavoriteResource(
        Long id,
        String targetType,
        Long targetId,
        String title,
        String subtitle,
        String imageUrl,
        boolean available) {}
