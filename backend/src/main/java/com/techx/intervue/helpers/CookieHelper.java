package com.techx.intervue.helpers;

import java.time.Duration;
import org.springframework.http.ResponseCookie;

public class CookieHelper {
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    /**
     * secure = app.cookie.secure (AuthConfig). Browsers drop a Secure cookie sent over plain HTTP
     * on any host but localhost, so it is only turned off for a deployment without HTTPS.
     */
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

    /**
     * rememberMe = false: session cookie (no Max-Age), the browser removes it on close. rememberMe
     * = true: lives for maxAge.
     */
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
