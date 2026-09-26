package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.ChatLimitsProperties;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import java.time.Duration;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

/**
 * Spec §8.4. Buckets live in Redis so several backend instances share one limit.
 *
 * <p>If Redis is down let the request through (fail-open): the rate limit is an anti-abuse layer,
 * not a security layer — letting Redis take all of chat down would trade one nuisance for an
 * outage.
 */
@Slf4j
@Service
public class Bucket4jChatRateLimiter implements ChatRateLimiterInterface {

    static final String KEY_PREFIX = "chat:rate:";

    private final ProxyManager<String> buckets;
    private final ChatLimitsProperties limits;

    /**
     * @Lazy here is what actually defers connecting to Redis: the chatRateLimitBuckets bean is
     * declared @Lazy but this service is an eager singleton, so injecting it directly would still
     * force creation at startup. With @Lazy Spring injects a proxy of the ProxyManager interface
     * and only connects when check() is called the first time.
     *
     * <p>The limit is validated right here, not left until use: capacity <= 0 makes
     * Bandwidth.builder() throw IllegalArgumentException, and the caller catches a broad
     * RuntimeException to fail open — a wrong config would silently turn the rate limit off
     * completely and log it wrongly as "Redis unavailable". A wrong config must die at startup,
     * where it is seen right away.
     */
    public Bucket4jChatRateLimiter(
            @Lazy ProxyManager<String> buckets, ChatLimitsProperties limits) {
        requirePositive("app.chat.limits.messages-per-minute", limits.messagesPerMinute());
        requirePositive("app.chat.limits.images-per-hour", limits.imagesPerHour());
        requirePositive("app.chat.limits.conversations-per-hour", limits.conversationsPerHour());
        requirePositive("app.chat.limits.typing-frames-per-minute", limits.typingFramesPerMinute());
        this.buckets = buckets;
        this.limits = limits;
    }

    private static void requirePositive(String property, int value) {
        if (value <= 0) {
            throw new IllegalArgumentException(
                    property + " must be greater than 0, but was " + value);
        }
    }

    @Override
    public void check(Long userId, Action action) {
        String key = KEY_PREFIX + action.name().toLowerCase(Locale.ROOT) + ":" + userId;
        boolean allowed;
        try {
            allowed = buckets.builder().build(key, () -> configFor(action)).tryConsume(1);
        } catch (RuntimeException e) {
            // Catch broadly: Spring's DataAccessException, Lettuce's RedisException and
            // bucket4j's BucketExecutionException are all RuntimeException and all mean
            // "could not ask Redis". RateLimitedException is thrown AFTER this block so it is not
            // swallowed.
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
            case TYPING -> bucket(limits.typingFramesPerMinute(), Duration.ofMinutes(1));
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
            // Never reaches the user: a typing frame is dropped silently because STOMP has no HTTP
            // code
            // to return (spec §7.1). Still written properly in case someone returns it later.
            case TYPING -> "You are typing too fast for us to keep up.";
        };
    }
}
