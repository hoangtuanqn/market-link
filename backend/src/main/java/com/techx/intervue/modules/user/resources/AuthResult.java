package com.techx.intervue.modules.user.resources;

/**
 * rememberMe quyết định cookie refresh_token là cookie phiên hay cookie lâu dài.
 *
 * <p>FR-008: admin đã bật 2FA thì bước mật khẩu chỉ trả {@code mfaToken} (token chờ), không có
 * access/refresh token.
 */
public record AuthResult(
        String accessToken,
        String refreshToken,
        UserResource user,
        boolean rememberMe,
        String mfaToken) {

    public AuthResult(
            String accessToken, String refreshToken, UserResource user, boolean rememberMe) {
        this(accessToken, refreshToken, user, rememberMe, null);
    }

    public static AuthResult mfaPending(UserResource user, boolean rememberMe, String mfaToken) {
        return new AuthResult(null, null, user, rememberMe, mfaToken);
    }

    public boolean mfaRequired() {
        return mfaToken != null;
    }
}
