package com.techx.intervue.modules.chat.services.impl;

import com.techx.intervue.modules.chat.ChatbotAiProperties;
import com.techx.intervue.modules.chat.enums.AssistantAudience;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AssistantRateLimiter {

    static final String KEY_PREFIX = "chatbot:ai:";
    static final String PLATFORM_KEY = "chatbot:ai:platform:day";

    private final ProxyManager<String> buckets;
    private final int perHour;
    private final int adminPerHour;
    private final int perDay;

    public AssistantRateLimiter(
            @Lazy ProxyManager<String> buckets, ChatbotAiProperties properties) {
        this.buckets = buckets;
        this.perHour = Math.max(1, properties.messagesPerHour());
        this.adminPerHour = Math.max(1, properties.adminMessagesPerHour());
        this.perDay = Math.max(1, properties.platformMessagesPerDay());
    }

    public boolean tryAcquire(Long userId, AssistantAudience audience) {
        int capacity = audience == AssistantAudience.ADMIN ? adminPerHour : perHour;
        try {
            return buckets.builder()
                    .build(KEY_PREFIX + userId, () -> configuration(capacity, Duration.ofHours(1)))
                    .tryConsume(1);
        } catch (RuntimeException e) {
            log.warn("Assistant rate limit check skipped, Redis unavailable: {}", e.getMessage());
            return true;
        }
    }

    public boolean tryAcquirePlatform() {
        try {
            return buckets.builder()
                    .build(PLATFORM_KEY, () -> configuration(perDay, Duration.ofDays(1)))
                    .tryConsume(1);
        } catch (RuntimeException e) {
            log.warn(
                    "Assistant daily cap not readable, keyword engine answers: {}", e.getMessage());
            return false;
        }
    }

    private BucketConfiguration configuration(int capacity, Duration window) {
        return BucketConfiguration.builder()
                .addLimit(
                        Bandwidth.builder()
                                .capacity(capacity)
                                .refillGreedy(capacity, window)
                                .build())
                .build();
    }
}
