package com.techx.intervue.modules.user.services.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.techx.intervue.config.OAuthProperties;
import com.techx.intervue.modules.user.enums.SocialProvider;
import com.techx.intervue.modules.user.resources.SocialProfile;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

/**
 * Google OAuth2 authorization code flow: đổi code (dùng client_secret) lấy id_token, rồi tự verify
 * id_token bằng public key của Google — không tin bất kỳ token nào frontend gửi lên.
 */
@Component
public class GoogleOAuthClient {

    private static final String TOKEN_URI = "https://oauth2.googleapis.com/token";
    private static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> ISSUERS =
            Set.of("https://accounts.google.com", "accounts.google.com");
    private static final String FAILED = "Google sign-in failed. Please try again.";

    private final RestClient restClient;
    private final OAuthProperties.Google config;
    private final NimbusJwtDecoder idTokenDecoder;

    public GoogleOAuthClient(RestClient oauthRestClient, OAuthProperties properties) {
        this.restClient = oauthRestClient;
        this.config = properties.google();
        // Tự tải + cache JWKS, kiểm chữ ký RS256; thêm kiểm tra exp/nbf, issuer và audience
        this.idTokenDecoder = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
        this.idTokenDecoder.setJwtValidator(
                new DelegatingOAuth2TokenValidator<>(
                        JwtValidators.createDefault(),
                        new JwtClaimValidator<String>(JwtClaimNames.ISS, ISSUERS::contains),
                        new JwtClaimValidator<List<String>>(
                                JwtClaimNames.AUD,
                                aud -> config != null && aud.contains(config.clientId()))));
    }

    public SocialProfile fetchProfile(String code) {
        if (config == null
                || !StringUtils.hasText(config.clientId())
                || !StringUtils.hasText(config.clientSecret())) {
            throw new IllegalStateException("app.oauth.google is not configured");
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", config.clientId());
        form.add("client_secret", config.clientSecret());
        form.add("redirect_uri", config.redirectUri());
        form.add("grant_type", "authorization_code");

        TokenResponse tokens =
                restClient
                        .post()
                        .uri(TOKEN_URI)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(form)
                        .retrieve()
                        // code sai / đã dùng / hết hạn, hoặc redirect_uri không khớp
                        .onStatus(
                                HttpStatusCode::is4xxClientError,
                                (req, res) -> {
                                    throw new BadCredentialsException(FAILED);
                                })
                        .body(TokenResponse.class);
        if (tokens == null || !StringUtils.hasText(tokens.idToken())) {
            throw new BadCredentialsException(FAILED);
        }

        Jwt idToken;
        try {
            idToken = idTokenDecoder.decode(tokens.idToken());
        } catch (JwtException e) {
            throw new BadCredentialsException(FAILED);
        }
        // Google có lúc trả email_verified dạng boolean, có lúc dạng chuỗi "true"
        Object verified = idToken.getClaims().get("email_verified");
        return new SocialProfile(
                SocialProvider.GOOGLE,
                idToken.getSubject(),
                idToken.getClaimAsString("email"),
                Boolean.TRUE.equals(verified) || "true".equals(verified),
                idToken.getClaimAsString("name"),
                idToken.getClaimAsString("picture"));
    }

    record TokenResponse(@JsonProperty("id_token") String idToken) {}
}
