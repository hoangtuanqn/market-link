package com.techx.intervue.config;

import com.techx.intervue.helpers.SecretCipher;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** FR-008: xác thực hai bước TOTP cho admin (app.mfa.* trong application.yaml). */
@Configuration
@Getter
public class MfaConfig {
    /** 32 byte Base64 mã hoá khoá TOTP trong DB. Prod bắt buộc truyền MFA_ENCRYPTION_KEY. */
    @Value("${app.mfa.encryption-key}")
    private String encryptionKey;

    /** Tên hiện trong app authenticator. */
    @Value("${app.mfa.issuer:MarketLink}")
    private String issuer;

    /** Thời gian sống của token chờ nhập mã sau bước mật khẩu. */
    @Value("${app.mfa.pending-ttl-seconds:300}")
    private long pendingTtlSeconds;

    /** Số lần nhập sai tối đa trước khi khoá. */
    @Value("${app.mfa.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.mfa.lock-seconds:900}")
    private long lockSeconds;

    @Bean
    SecretCipher mfaSecretCipher() {
        return new SecretCipher(encryptionKey);
    }
}
