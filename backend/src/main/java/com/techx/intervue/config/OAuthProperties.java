package com.techx.intervue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** app.oauth.* — client id/secret của Google. Secret chỉ tồn tại ở backend. */
@ConfigurationProperties(prefix = "app.oauth")
public record OAuthProperties(Google google) {

    public record Google(String clientId, String clientSecret, String redirectUri) {}
}
