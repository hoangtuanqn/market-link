package com.techx.intervue.modules.chat.services.impl;

import com.techx.intervue.modules.chat.ChatbotAiProperties;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

/**
 * Caps how many messages per account Claude answers in an hour, on the same Redis-backed bucket4j
 * proxy as the other limits ({@code RedisConfig}). Over the cap the message is still answered, by
 * the keyword engine, so this only bounds the API bill. Redis down → allowed (fail-open), like
 * {@code FeedbackRateLimiter}.
 */
@Slf4j
@Component
public class AssistantRateLimiter {

    static final String KEY_PREFIX = "chatbot:ai:";

    private final ProxyManager<String> buckets;
    private final int perHour;

    /** {@code @Lazy} defers the Redis connection to the first check, see {@code RedisConfig}. */
    public AssistantRateLimiter(
            @Lazy ProxyManager<String> buckets, ChatbotAiProperties properties) {
        this.buckets = buckets;
        this.perHour = Math.max(1, properties.messagesPerHour());
    }

    public boolean tryAcquire(Long userId) {
        try {
            return buckets.builder().build(KEY_PREFIX + userId, this::configuration).tryConsume(1);
        } catch (RuntimeException e) {
            log.warn("Assistant rate limit check skipped, Redis unavailable: {}", e.getMessage());
            return true;
        }
    }

    private BucketConfiguration configuration() {
        return BucketConfiguration.builder()
                .addLimit(
                        Bandwidth.builder()
                                .capacity(perHour)
                                .refillGreedy(perHour, Duration.ofHours(1))
                                .build())
                .build();
    }
}
