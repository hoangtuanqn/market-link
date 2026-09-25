package com.techx.intervue.modules.user.exceptions;

/** Chưa điền client id / secret / redirect uri trong app.oauth.* → 503. */
public class OAuthNotConfiguredException extends RuntimeException {
    public OAuthNotConfiguredException(String provider) {
        super("app.oauth." + provider + " is not configured");
    }
}
