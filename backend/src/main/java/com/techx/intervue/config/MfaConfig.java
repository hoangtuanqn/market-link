package com.techx.intervue.config;

import com.techx.intervue.helpers.SecretCipher;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** FR-008: TOTP two-step verification for admins (app.mfa.* in application.yaml). */
@Configuration
@Getter
public class MfaConfig {
    /**
     * 32 bytes, Base64; encrypts the TOTP key in the DB. Prod requires MFA_ENCRYPTION_KEY to be
     * passed.
     */
    @Value("${app.mfa.encryption-key}")
    private String encryptionKey;

    /** Name shown in the authenticator app. */
    @Value("${app.mfa.issuer:MarketLink}")
    private String issuer;

    /** Lifetime of the token that waits for the code after the password step. */
    @Value("${app.mfa.pending-ttl-seconds:300}")
    private long pendingTtlSeconds;

    /** Maximum number of wrong attempts before locking. */
    @Value("${app.mfa.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.mfa.lock-seconds:900}")
    private long lockSeconds;

    @Bean
    SecretCipher mfaSecretCipher() {
        return new SecretCipher(encryptionKey);
    }
}
