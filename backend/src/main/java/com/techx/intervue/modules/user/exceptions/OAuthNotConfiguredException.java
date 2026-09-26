package com.techx.intervue.modules.user.exceptions;

/** The client id / secret / redirect uri in app.oauth.* has not been filled in → 503. */
public class OAuthNotConfiguredException extends RuntimeException {
    public OAuthNotConfiguredException(String provider) {
        super("app.oauth." + provider + " is not configured");
    }
}
