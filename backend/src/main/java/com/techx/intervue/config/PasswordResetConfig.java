package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class PasswordResetConfig {
    @Value("${app.password-reset.url}")
    private String url;

    @Value("${app.password-reset.token-ttl-seconds:900}")
    private long tokenTtlSeconds;

    @Value("${app.password-reset.max-requests:5}")
    private long maxRequests;

    @Value("${app.password-reset.window-seconds:3600}")
    private long windowSeconds;

    @Value("${app.password-reset.max-requests-per-ip:20}")
    private long maxRequestsPerIp;
}
