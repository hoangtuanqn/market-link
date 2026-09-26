package com.techx.intervue.modules.user.resources;

/**
 * FR-008: {@code mfaRequired = true} → no session yet (accessToken null), the FE moves to the code
 * entry screen and sends {@code mfaToken} to POST /auth/mfa/verify.
 */
public record LoginResource(
        String accessToken, UserResource user, boolean mfaRequired, String mfaToken) {

    public LoginResource(String accessToken, UserResource user) {
        this(accessToken, user, false, null);
    }
}
