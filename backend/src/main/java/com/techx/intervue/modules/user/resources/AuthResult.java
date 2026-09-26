package com.techx.intervue.modules.user.resources;

/**
 * rememberMe decides whether the refresh_token cookie is a session cookie or a long-lived cookie.
 *
 * <p>FR-008: an admin with 2FA on only gets {@code mfaToken} (the pending token) from the password
 * step, without any access/refresh token.
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
