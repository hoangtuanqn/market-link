package com.techx.intervue.helpers;

import java.time.Duration;
import org.springframework.http.ResponseCookie;

public class CookieHelper {
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    public static ResponseCookie buildRefreshTokenCookie(String token, Duration maxAge) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    /**
     * rememberMe = false: session cookie (no Max-Age), the browser removes it on close. rememberMe
     * = true: lives for maxAge.
     */
    public static ResponseCookie buildRefreshTokenCookie(
            String token, Duration maxAge, boolean rememberMe) {
        return rememberMe
                ? buildRefreshTokenCookie(token, maxAge)
                : ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                        .httpOnly(true)
                        .secure(true)
                        .sameSite("Strict")
                        .path("/")
                        .build();
    }
}
