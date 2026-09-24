package com.techx.intervue.modules.user.resources;

/** rememberMe quyết định cookie refresh_token là cookie phiên hay cookie lâu dài. */
public record AuthResult(
        String accessToken, String refreshToken, UserResource user, boolean rememberMe) {}
