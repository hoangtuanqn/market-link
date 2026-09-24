package com.techx.intervue.modules.user.services.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.techx.intervue.config.OAuthProperties;
import com.techx.intervue.modules.user.enums.SocialProvider;
import com.techx.intervue.modules.user.resources.SocialProfile;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

/**
 * Facebook Login (authorization code flow): đổi code (dùng app_secret) lấy access token, kiểm tra
 * token qua debug_token là của đúng app mình, rồi mới lấy thông tin user.
 */
@Component
public class FacebookOAuthClient {

    private static final String FAILED = "Đăng nhập Facebook thất bại, vui lòng thử lại!";

    private final RestClient restClient;
    private final OAuthProperties.Facebook config;

    public FacebookOAuthClient(RestClient oauthRestClient, OAuthProperties properties) {
        this.restClient = oauthRestClient;
        this.config = properties.facebook();
    }

    public SocialProfile fetchProfile(String code) {
        if (config == null
                || !StringUtils.hasText(config.appId())
                || !StringUtils.hasText(config.appSecret())) {
            throw new IllegalStateException("Chưa cấu hình app.oauth.facebook");
        }
        String graph = "https://graph.facebook.com/" + config.graphVersion();

        // 1. Đổi code lấy user access token
        TokenResponse tokens =
                get(
                        graph
                                + "/oauth/access_token?client_id={id}&redirect_uri={redirect}"
                                + "&client_secret={secret}&code={code}",
                        Map.of(
                                "id", config.appId(),
                                "redirect", config.redirectUri(),
                                "secret", config.appSecret(),
                                "code", code),
                        TokenResponse.class);
        if (tokens == null || !StringUtils.hasText(tokens.accessToken())) {
            throw new BadCredentialsException(FAILED);
        }

        // 2. Token phải còn hiệu lực và được cấp cho chính app của mình
        DebugResponse debug =
                get(
                        graph + "/debug_token?input_token={token}&access_token={appToken}",
                        Map.of(
                                "token",
                                tokens.accessToken(),
                                "appToken",
                                config.appId() + "|" + config.appSecret()),
                        DebugResponse.class);
        if (debug == null
                || debug.data() == null
                || !debug.data().isValid()
                || !config.appId().equals(debug.data().appId())) {
            throw new BadCredentialsException(FAILED);
        }

        // 3. Lấy thông tin user; appsecret_proof chứng minh request đến từ server có app_secret
        MeResponse me =
                get(
                        graph
                                + "/me?fields=id,name,email,picture.width(256).height(256)"
                                + "&access_token={token}&appsecret_proof={proof}",
                        Map.of(
                                "token", tokens.accessToken(),
                                "proof", appSecretProof(tokens.accessToken())),
                        MeResponse.class);
        if (me == null || !debug.data().userId().equals(me.id())) {
            throw new BadCredentialsException(FAILED);
        }
        String picture =
                me.picture() != null && me.picture().data() != null
                        ? me.picture().data().url()
                        : null;
        // Facebook chỉ trả email chính đã được xác nhận của tài khoản, nên coi là đã xác minh
        return new SocialProfile(
                SocialProvider.FACEBOOK,
                me.id(),
                me.email(),
                me.email() != null,
                me.name(),
                picture);
    }

    private <T> T get(String uriTemplate, Map<String, String> params, Class<T> type) {
        return restClient
                .get()
                .uri(uriTemplate, params)
                .retrieve()
                .onStatus(
                        HttpStatusCode::is4xxClientError,
                        (req, res) -> {
                            throw new BadCredentialsException(FAILED);
                        })
                .body(type);
    }

    private String appSecretProof(String accessToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(
                    new SecretKeySpec(
                            config.appSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of()
                    .formatHex(mac.doFinal(accessToken.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không tạo được appsecret_proof", e);
        }
    }

    record TokenResponse(@JsonProperty("access_token") String accessToken) {}

    record DebugResponse(DebugData data) {}

    record DebugData(
            @JsonProperty("is_valid") boolean isValid,
            @JsonProperty("app_id") String appId,
            @JsonProperty("user_id") String userId) {}

    record MeResponse(String id, String name, String email, Picture picture) {}

    record Picture(PictureData data) {}

    record PictureData(String url) {}
}
