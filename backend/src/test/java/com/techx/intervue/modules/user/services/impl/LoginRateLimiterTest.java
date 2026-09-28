package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.LoginRateLimitConfig;
import com.techx.intervue.modules.user.exceptions.LoginRateLimitedException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/** FR-003: wrong passwords on sign-in are counted per email and per IP, and the lock expires. */
class LoginRateLimiterTest {

    private static final String EMAIL = "an@example.com";
    private static final String IP = "203.0.113.9";

    /** A tiny in-memory Redis: value + TTL per key, enough for INCR / GET / EXPIRE / DEL. */
    private final Map<String, Long> counts = new HashMap<>();

    private final Map<String, Long> ttls = new HashMap<>();
    private LoginRateLimiter limiter;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.increment(anyString()))
                .thenAnswer(inv -> counts.merge(inv.getArgument(0), 1L, Long::sum));
        when(values.get(anyString()))
                .thenAnswer(
                        inv -> {
                            Long count = counts.get((String) inv.getArgument(0));
                            return count == null ? null : count.toString();
                        });
        when(redis.expire(anyString(), any(Duration.class)))
                .thenAnswer(
                        inv -> {
                            ttls.put(
                                    inv.getArgument(0),
                                    ((Duration) inv.getArgument(1)).toSeconds());
                            return true;
                        });
        when(redis.getExpire(anyString()))
                .thenAnswer(inv -> ttls.getOrDefault((String) inv.getArgument(0), -1L));
        when(redis.getExpire(anyString(), eq(TimeUnit.SECONDS)))
                .thenAnswer(inv -> ttls.getOrDefault((String) inv.getArgument(0), -1L));
        when(redis.delete(anyString()))
                .thenAnswer(
                        inv -> {
                            ttls.remove((String) inv.getArgument(0));
                            return counts.remove((String) inv.getArgument(0)) != null;
                        });

        LoginRateLimitConfig config = mock(LoginRateLimitConfig.class);
        when(config.getMaxFailures()).thenReturn(10L);
        when(config.getMaxFailuresPerIp()).thenReturn(50L);
        when(config.getWindowSeconds()).thenReturn(900L);
        limiter = new LoginRateLimiter(redis, config);
    }

    private void fail(int times, String email, String ip) {
        for (int i = 0; i < times; i++) {
            limiter.ensureAllowed(email, ip);
            limiter.recordFailure(email, ip);
        }
    }

    @Test
    void tenWrongPasswordsLockTheEmailWithRetryAfter() {
        fail(10, EMAIL, IP);

        assertThatThrownBy(() -> limiter.ensureAllowed(EMAIL, IP))
                .isInstanceOfSatisfying(
                        LoginRateLimitedException.class,
                        e -> assertThat(e.getRetryAfterSeconds()).isEqualTo(900L));
    }

    @Test
    void theEmailIsMatchedWhateverItsCase() {
        fail(10, " An@Example.com ", IP);

        assertThatThrownBy(() -> limiter.ensureAllowed(EMAIL, "198.51.100.4"))
                .isInstanceOf(LoginRateLimitedException.class);
    }

    @Test
    void theCounterAlwaysExpiresSoTheLockIsNotForever() {
        fail(10, EMAIL, IP);

        assertThat(ttls).containsEntry(LoginRateLimiter.EMAIL_PREFIX + EMAIL, 900L);
        assertThat(ttls).containsEntry(LoginRateLimiter.IP_PREFIX + IP, 900L);
    }

    @Test
    void aSuccessClearsTheEmailCounter() {
        fail(9, EMAIL, IP);
        limiter.reset(EMAIL);
        fail(9, EMAIL, IP);

        assertThatCode(() -> limiter.ensureAllowed(EMAIL, IP)).doesNotThrowAnyException();
    }

    @Test
    void oneIpTryingManyAccountsIsLocked() {
        for (int i = 0; i < 50; i++) {
            fail(1, "user" + i + "@example.com", IP);
        }

        assertThatThrownBy(() -> limiter.ensureAllowed("someone@example.com", IP))
                .isInstanceOf(LoginRateLimitedException.class);
        assertThatCode(() -> limiter.ensureAllowed("someone@example.com", "198.51.100.4"))
                .doesNotThrowAnyException();
    }
}
