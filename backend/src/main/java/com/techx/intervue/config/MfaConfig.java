package com.techx.intervue.config;

import com.techx.intervue.helpers.SecretCipher;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class MfaConfig {
    @Value("${app.mfa.encryption-key}")
    private String encryptionKey;

    @Value("${app.mfa.issuer:MarketLink}")
    private String issuer;

    @Value("${app.mfa.pending-ttl-seconds:300}")
    private long pendingTtlSeconds;

    @Value("${app.mfa.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.mfa.lock-seconds:900}")
    private long lockSeconds;

    @Bean
    SecretCipher mfaSecretCipher() {
        return new SecretCipher(encryptionKey);
    }
}
