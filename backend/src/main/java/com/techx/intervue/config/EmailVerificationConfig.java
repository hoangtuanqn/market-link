package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class EmailVerificationConfig {
    @Value("${app.email-verification.code-ttl-seconds:600}")
    private long codeTtlSeconds;

    @Value("${app.email-verification.pending-ttl-seconds:1800}")
    private long pendingTtlSeconds;

    @Value("${app.email-verification.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.email-verification.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.email-verification.max-sends-per-email:5}")
    private long maxSendsPerEmail;

    @Value("${app.email-verification.max-sends-per-ip:20}")
    private long maxSendsPerIp;

    @Value("${app.email-verification.window-seconds:3600}")
    private long windowSeconds;
}
