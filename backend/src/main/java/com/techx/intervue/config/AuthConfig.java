package com.techx.intervue.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class AuthConfig {
    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private Long expirationTime;

    @Value("${jwt.issuer}")
    private String issuer;

    @Value("${jwt.refresh-token-ttl-days}")
    private Integer refreshTokenTTLDays = 14;
}
