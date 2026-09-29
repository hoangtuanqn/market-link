package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/** FR-003: brute-force guard on POST /auth/login (app.login-rate-limit.* in application.yaml). */
@Configuration
@Getter
public class LoginRateLimitConfig {
    /** Wrong passwords allowed for one email within window-seconds before it answers 429. */
    @Value("${app.login-rate-limit.max-failures:10}")
    private long maxFailures;

    /**
     * Wrong passwords allowed from one IP within window-seconds, whatever the email (blocks trying
     * one password against many accounts).
     */
    @Value("${app.login-rate-limit.max-failures-per-ip:50}")
    private long maxFailuresPerIp;

    /** Counted from the first failure; the lock lifts by itself when the window ends. */
    @Value("${app.login-rate-limit.window-seconds:900}")
    private long windowSeconds;
}
