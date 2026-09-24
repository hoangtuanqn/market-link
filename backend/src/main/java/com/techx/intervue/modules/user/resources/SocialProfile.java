package com.techx.intervue.modules.user.resources;

import com.techx.intervue.modules.user.enums.SocialProvider;

/** Thông tin người dùng đã được backend xác minh trực tiếp với Google/Facebook. */
public record SocialProfile(
        SocialProvider provider,
        String providerUserId,
        String email,
        boolean emailVerified,
        String name,
        String pictureUrl) {}
