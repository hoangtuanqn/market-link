package com.techx.intervue.services.impl;

import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import java.time.Duration;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@AllArgsConstructor
public class BlacklistRedisService implements BlacklistServiceInterface {

    private final RedisTemplate<String, Object> redis;

    public void revoke(String jti, Instant expiresAt) {
        long ttlSeconds = Duration.between(Instant.now(), expiresAt).getSeconds();
        if (ttlSeconds <= 0) return;
        // Phải truyền Duration: set(key, value, long) là lệnh SETRANGE (offset), không phải TTL
        redis.opsForValue().set(PREFIX + jti, "revoked", Duration.ofSeconds(ttlSeconds));
    }

    public Boolean isRevoked(String jti) {
        return redis.hasKey(PREFIX + jti);
    }
}
