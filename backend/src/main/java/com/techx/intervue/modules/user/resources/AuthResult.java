package com.techx.intervue.modules.user.resources;

public record AuthResult(
        String accessToken,
        String refreshToken,
        UserResource user,
        boolean rememberMe,
        String mfaToken,
        boolean mfaSetupRequired) {

    public AuthResult(
            String accessToken,
            String refreshToken,
            UserResource user,
            boolean rememberMe,
            String mfaToken) {
        this(accessToken, refreshToken, user, rememberMe, mfaToken, false);
    }

    public AuthResult(
            String accessToken, String refreshToken, UserResource user, boolean rememberMe) {
        this(accessToken, refreshToken, user, rememberMe, null, false);
    }

    public static AuthResult mfaPending(UserResource user, boolean rememberMe, String mfaToken) {
        return new AuthResult(null, null, user, rememberMe, mfaToken, false);
    }

    public static AuthResult mfaSetupPending(
            String accessToken, String refreshToken, UserResource user, boolean rememberMe) {
        return new AuthResult(accessToken, refreshToken, user, rememberMe, null, true);
    }

    public boolean mfaRequired() {
        return mfaToken != null;
    }
}
