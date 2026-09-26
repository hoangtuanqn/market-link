package com.techx.intervue.modules.user.resources;

import com.techx.intervue.modules.user.enums.SocialProvider;

/** User information that the backend verified directly with Google. */
public record SocialProfile(
        SocialProvider provider,
        String providerUserId,
        String email,
        boolean emailVerified,
        String name,
        String pictureUrl) {}
