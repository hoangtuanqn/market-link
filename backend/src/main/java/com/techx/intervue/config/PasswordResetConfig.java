package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/** FR-007: cấu hình quên mật khẩu (app.password-reset.* trong application.yaml). */
@Configuration
@Getter
public class PasswordResetConfig {
    /** Trang đặt lại mật khẩu của frontend, link gửi đi là url?token=... */
    @Value("${app.password-reset.url}")
    private String url;

    @Value("${app.password-reset.token-ttl-seconds:900}")
    private long tokenTtlSeconds;

    /** Số lần gửi yêu cầu tối đa cho một email trong window-seconds. */
    @Value("${app.password-reset.max-requests:5}")
    private long maxRequests;

    @Value("${app.password-reset.window-seconds:3600}")
    private long windowSeconds;
}
