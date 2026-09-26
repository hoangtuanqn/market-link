package com.techx.intervue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** app.oauth.* — Google's client id/secret. The secret exists only in the backend. */
@ConfigurationProperties(prefix = "app.oauth")
public record OAuthProperties(Google google) {

    public record Google(String clientId, String clientSecret, String redirectUri) {}
}
