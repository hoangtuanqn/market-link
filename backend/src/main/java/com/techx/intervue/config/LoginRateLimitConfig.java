package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class LoginRateLimitConfig {
    @Value("${app.login-rate-limit.max-failures:10}")
    private long maxFailures;

    @Value("${app.login-rate-limit.max-failures-per-ip:50}")
    private long maxFailuresPerIp;

    @Value("${app.login-rate-limit.window-seconds:900}")
    private long windowSeconds;
}
