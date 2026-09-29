package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.LoginRateLimitConfig;
import com.techx.intervue.modules.user.exceptions.LoginRateLimitedException;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoginRateLimiter {

    static final String EMAIL_PREFIX = "ratelimit:login:";
    static final String IP_PREFIX = "ratelimit:login-ip:";

    private final StringRedisTemplate redis;
    private final LoginRateLimitConfig config;

    public void ensureAllowed(String email, String clientIp) {
        ensureUnder(IP_PREFIX + clientIp, config.getMaxFailuresPerIp());
        ensureUnder(EMAIL_PREFIX + normalize(email), config.getMaxFailures());
    }

    public void recordFailure(String email, String clientIp) {
        increment(IP_PREFIX + clientIp);
        increment(EMAIL_PREFIX + normalize(email));
    }

    public void reset(String email) {
        redis.delete(EMAIL_PREFIX + normalize(email));
    }

    private void ensureUnder(String key, long maxFailures) {
        String count = redis.opsForValue().get(key);
        if (count != null && Long.parseLong(count) >= maxFailures) {
            log.info("Sign-in rate limit reached, attempt refused");
            throw new LoginRateLimitedException(remaining(key));
        }
    }

    private void increment(String key) {
        Long count = redis.opsForValue().increment(key);
        Duration window = Duration.ofSeconds(config.getWindowSeconds());
        if (count == null || count == 1) {
            redis.expire(key, window);
        } else if (redis.getExpire(key) == -1) {
            redis.expire(key, window);
        }
    }

    private long remaining(String key) {
        Long ttl = redis.getExpire(key, TimeUnit.SECONDS);
        return ttl == null || ttl < 0 ? config.getWindowSeconds() : ttl;
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
