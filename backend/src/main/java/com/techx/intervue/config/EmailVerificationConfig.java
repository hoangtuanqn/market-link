package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/** FR-009: limits of the 6-digit sign-up code (spec 2026-09-28-email-verification-design §5). */
@Configuration
@Getter
public class EmailVerificationConfig {
    @Value("${app.email-verification.code-ttl-seconds:600}")
    private long codeTtlSeconds;

    /** How long an unfinished sign-up waits in Redis; every new code extends it. */
    @Value("${app.email-verification.pending-ttl-seconds:1800}")
    private long pendingTtlSeconds;

    @Value("${app.email-verification.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    /** Wrong codes allowed before the code is thrown away. */
    @Value("${app.email-verification.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.email-verification.max-sends-per-email:5}")
    private long maxSendsPerEmail;

    /** Blocks one IP from mailing many different addresses. */
    @Value("${app.email-verification.max-sends-per-ip:20}")
    private long maxSendsPerIp;

    @Value("${app.email-verification.window-seconds:3600}")
    private long windowSeconds;
}
