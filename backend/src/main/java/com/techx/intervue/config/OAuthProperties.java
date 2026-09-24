package com.techx.intervue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** app.oauth.* — client id/secret của Google và Facebook. Secret chỉ tồn tại ở backend. */
@ConfigurationProperties(prefix = "app.oauth")
public record OAuthProperties(Google google, Facebook facebook) {

    public record Google(String clientId, String clientSecret, String redirectUri) {}

    public record Facebook(
            String appId, String appSecret, String redirectUri, String graphVersion) {}
}
