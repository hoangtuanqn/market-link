package com.techx.intervue.modules.feedback.services.impl;

import com.techx.intervue.modules.feedback.exceptions.FeedbackRateLimitedException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

/**
 * FR-081: the form is public, so the guard is per client address — 5 submissions an hour, on the
 * same Redis-backed bucket4j proxy the chat limits use ({@code RedisConfig}). Redis down → the
 * request goes through (fail-open), exactly like {@code Bucket4jChatRateLimiter}: this is an
 * anti-abuse layer, not a security one.
 */
@Slf4j
@Service
public class FeedbackRateLimiter {

    static final String KEY_PREFIX = "feedback:rate:";
    static final int PER_HOUR = 5;

    private final ProxyManager<String> buckets;

    /** {@code @Lazy} defers the Redis connection to the first check, see {@code RedisConfig}. */
    public FeedbackRateLimiter(@Lazy ProxyManager<String> buckets) {
        this.buckets = buckets;
    }

    public void check(String clientKey) {
        boolean allowed;
        try {
            allowed =
                    buckets.builder()
                            .build(KEY_PREFIX + clientKey, FeedbackRateLimiter::configuration)
                            .tryConsume(1);
        } catch (RuntimeException e) {
            log.warn("Feedback rate limit check skipped, Redis unavailable: {}", e.getMessage());
            return;
        }
        if (!allowed) {
            throw new FeedbackRateLimitedException();
        }
    }

    private static BucketConfiguration configuration() {
        return BucketConfiguration.builder()
                .addLimit(
                        Bandwidth.builder()
                                .capacity(PER_HOUR)
                                .refillGreedy(PER_HOUR, Duration.ofHours(1))
                                .build())
                .build();
    }
}
