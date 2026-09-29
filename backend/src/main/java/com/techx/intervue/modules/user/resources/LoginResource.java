package com.techx.intervue.modules.user.resources;

public record LoginResource(
        String accessToken,
        UserResource user,
        boolean mfaRequired,
        String mfaToken,
        boolean mfaSetupRequired) {

    public LoginResource(
            String accessToken, UserResource user, boolean mfaRequired, String mfaToken) {
        this(accessToken, user, mfaRequired, mfaToken, false);
    }

    public LoginResource(String accessToken, UserResource user) {
        this(accessToken, user, false, null, false);
    }
}
