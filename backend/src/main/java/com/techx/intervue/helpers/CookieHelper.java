package com.techx.intervue.helpers;

import java.time.Duration;
import org.springframework.http.ResponseCookie;

public class CookieHelper {
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    public static ResponseCookie buildRefreshTokenCookie(
            String token, Duration maxAge, boolean secure) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    public static ResponseCookie buildRefreshTokenCookie(
            String token, Duration maxAge, boolean rememberMe, boolean secure) {
        return rememberMe
                ? buildRefreshTokenCookie(token, maxAge, secure)
                : ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                        .httpOnly(true)
                        .secure(secure)
                        .sameSite("Strict")
                        .path("/")
                        .build();
    }
}
