package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.ChatLimitsProperties;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import java.time.Duration;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Spec §8.4. Bucket sống trên Redis nên nhiều instance backend dùng chung một hạn mức.
 *
 * <p>Redis hỏng thì cho request đi qua (fail-open): rate limit là lớp chống lạm dụng, không phải
 * lớp bảo mật — để Redis kéo cả chat sập là đổi một phiền toái lấy một sự cố.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class Bucket4jChatRateLimiter implements ChatRateLimiterInterface {

    static final String KEY_PREFIX = "chat:rate:";

    private final ProxyManager<String> buckets;
    private final ChatLimitsProperties limits;

    @Override
    public void check(Long userId, Action action) {
        String key = KEY_PREFIX + action.name().toLowerCase(Locale.ROOT) + ":" + userId;
        boolean allowed;
        try {
            allowed = buckets.builder().build(key, () -> configFor(action)).tryConsume(1);
        } catch (RuntimeException e) {
            // Bắt rộng: DataAccessException của Spring, RedisException của Lettuce và
            // BucketExecutionException của bucket4j đều là RuntimeException và đều nghĩa là
            // "không hỏi được Redis". RateLimitedException ném SAU khối này nên không bị nuốt.
            log.warn("Chat rate limit check skipped, Redis unavailable: {}", e.getMessage());
            return;
        }
        if (!allowed) {
            throw new RateLimitedException(reasonFor(action));
        }
    }

    private BucketConfiguration configFor(Action action) {
        return switch (action) {
            case MESSAGE -> bucket(limits.messagesPerMinute(), Duration.ofMinutes(1));
            case IMAGE -> bucket(limits.imagesPerHour(), Duration.ofHours(1));
            case CONVERSATION -> bucket(limits.conversationsPerHour(), Duration.ofHours(1));
        };
    }

    private static BucketConfiguration bucket(int capacity, Duration window) {
        return BucketConfiguration.builder()
                .addLimit(
                        Bandwidth.builder()
                                .capacity(capacity)
                                .refillGreedy(capacity, window)
                                .build())
                .build();
    }

    private static String reasonFor(Action action) {
        return switch (action) {
            case MESSAGE -> "You are sending messages too quickly. Wait a moment and try again.";
            case IMAGE -> "You are sending photos too quickly. Wait a moment and try again.";
            case CONVERSATION ->
                    "You have started too many conversations in the last hour. Try again later.";
        };
    }
}
