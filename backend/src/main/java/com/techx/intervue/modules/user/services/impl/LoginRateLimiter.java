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

/**
 * FR-003: counts wrong passwords on POST /auth/login so a password cannot be guessed by trying
 * again and again. Once a counter reaches its limit every attempt answers 429 — even the right
 * password, otherwise the guess would still be confirmed — until the window ends by itself.
 *
 * <pre>
 * ratelimit:login:{email}   wrong passwords for one email in the window (deleted on a success)
 * ratelimit:login-ip:{ip}   wrong passwords from one IP in the window, whatever the email
 * </pre>
 *
 * The counters live in Redis like PasswordResetService's. Sign-in needs Redis anyway (the session
 * cache), so a Redis failure here surfaces as the same 503 as there.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginRateLimiter {

    static final String EMAIL_PREFIX = "ratelimit:login:";
    static final String IP_PREFIX = "ratelimit:login-ip:";

    private final StringRedisTemplate redis;
    private final LoginRateLimitConfig config;

    /** Before the password is checked: refuse while either counter is at its limit. */
    public void ensureAllowed(String email, String clientIp) {
        ensureUnder(IP_PREFIX + clientIp, config.getMaxFailuresPerIp());
        ensureUnder(EMAIL_PREFIX + normalize(email), config.getMaxFailures());
    }

    public void recordFailure(String email, String clientIp) {
        increment(IP_PREFIX + clientIp);
        increment(EMAIL_PREFIX + normalize(email));
    }

    /**
     * The right password clears the email's counter. The IP counter is kept: one success must not
     * reopen a run of guesses against other accounts.
     */
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

    /**
     * INCR, set EXPIRE the first time. If the key lost its TTL (a crash between the two commands)
     * set it again, so a lock can never become permanent.
     */
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
