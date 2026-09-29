package com.techx.intervue.modules.user.exceptions;

public class OAuthNotConfiguredException extends RuntimeException {
    public OAuthNotConfiguredException(String provider) {
        super("app.oauth." + provider + " is not configured");
    }
}
