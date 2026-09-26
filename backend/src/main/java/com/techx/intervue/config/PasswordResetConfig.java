package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/** FR-007: forgot-password configuration (app.password-reset.* in application.yaml). */
@Configuration
@Getter
public class PasswordResetConfig {
    /** The frontend's password reset page; the link that is sent is url?token=... */
    @Value("${app.password-reset.url}")
    private String url;

    @Value("${app.password-reset.token-ttl-seconds:900}")
    private long tokenTtlSeconds;

    /** Maximum number of requests per email within window-seconds. */
    @Value("${app.password-reset.max-requests:5}")
    private long maxRequests;

    @Value("${app.password-reset.window-seconds:3600}")
    private long windowSeconds;

    /**
     * Maximum number of requests per IP within window-seconds (blocks spamming many different
     * emails).
     */
    @Value("${app.password-reset.max-requests-per-ip:20}")
    private long maxRequestsPerIp;
}
