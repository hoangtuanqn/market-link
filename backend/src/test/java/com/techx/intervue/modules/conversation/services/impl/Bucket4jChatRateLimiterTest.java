package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.ChatLimitsProperties;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface.Action;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.BucketProxy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.distributed.proxy.RemoteBucketBuilder;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.QueryTimeoutException;

class Bucket4jChatRateLimiterTest {

    ProxyManager<String> buckets;
    RemoteBucketBuilder<String> builder;
    BucketProxy bucket;
    Bucket4jChatRateLimiter limiter;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        buckets = mock(ProxyManager.class);
        builder = mock(RemoteBucketBuilder.class);
        bucket = mock(BucketProxy.class);
        when(buckets.builder()).thenReturn(builder);
        when(builder.build(any(String.class), any(Supplier.class))).thenReturn(bucket);
        limiter = new Bucket4jChatRateLimiter(buckets, new ChatLimitsProperties(30, 10, 20, 120));
    }

    @Test
    void letsTheRequestThroughWhileThereAreTokensLeft() {
        when(bucket.tryConsume(1)).thenReturn(true);

        assertThatCode(() -> limiter.check(7L, Action.MESSAGE)).doesNotThrowAnyException();
    }

    @Test
    void refusesWithAReasonOnceTheBucketIsEmpty() {
        when(bucket.tryConsume(1)).thenReturn(false);

        assertThatThrownBy(() -> limiter.check(7L, Action.IMAGE))
                .isInstanceOf(RateLimitedException.class)
                .hasMessage("You are sending photos too quickly. Wait a moment and try again.");
    }

    @Test
    @SuppressWarnings("unchecked")
    void eachActionHasItsOwnBucketKey() {
        when(bucket.tryConsume(1)).thenReturn(true);

        limiter.check(7L, Action.MESSAGE);
        limiter.check(7L, Action.IMAGE);
        limiter.check(7L, Action.CONVERSATION);

        ArgumentCaptor<String> keys = ArgumentCaptor.forClass(String.class);
        verify(builder, times(3)).build(keys.capture(), any(Supplier.class));
        assertThat(keys.getAllValues())
                .containsExactly(
                        "chat:rate:message:7", "chat:rate:image:7", "chat:rate:conversation:7");
    }

    @Test
    @SuppressWarnings("unchecked")
    void eachActionCarriesItsOwnCapacityAndWindow() {
        when(bucket.tryConsume(1)).thenReturn(true);

        limiter.check(7L, Action.MESSAGE);
        limiter.check(7L, Action.IMAGE);

        ArgumentCaptor<Supplier<BucketConfiguration>> configs =
                ArgumentCaptor.forClass(Supplier.class);
        verify(builder, times(2)).build(any(String.class), configs.capture());
        assertThat(configs.getAllValues().get(0).get().getBandwidths()[0].getCapacity())
                .isEqualTo(30);
        assertThat(configs.getAllValues().get(1).get().getBandwidths()[0].getCapacity())
                .isEqualTo(10);
    }

    /** Review Focus #4: if Redis is down chat still works, only the anti-spam layer is lost. */
    @Test
    void letsTheRequestThroughWhenRedisIsDown() {
        when(bucket.tryConsume(1)).thenThrow(new QueryTimeoutException("redis is gone"));

        assertThatCode(() -> limiter.check(7L, Action.MESSAGE)).doesNotThrowAnyException();
    }

    /**
     * If it is not checked at build time, capacity <= 0 would throw IllegalArgumentException from
     * inside the try block of check(), be swallowed by the fail-open branch, and the rate limit
     * would be turned off silently with a log wrongly reading "Redis unavailable".
     */
    @Test
    void aNonPositiveLimitIsRefusedAtStartupInsteadOfSilentlyDisablingTheLimiter() {
        assertThatThrownBy(
                        () ->
                                new Bucket4jChatRateLimiter(
                                        buckets, new ChatLimitsProperties(30, 0, 20, 120)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("app.chat.limits.images-per-hour");
    }

    @Test
    void anUnsetLimitsBlockIsRefusedAtStartupToo() {
        assertThatThrownBy(
                        () ->
                                new Bucket4jChatRateLimiter(
                                        buckets, new ChatLimitsProperties(0, 0, 0, 0)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void typingHasItsOwnBucketAndCapacity() {
        when(bucket.tryConsume(1)).thenReturn(true);

        limiter.check(7L, Action.TYPING);

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Supplier<BucketConfiguration>> config =
                ArgumentCaptor.forClass(Supplier.class);
        verify(builder).build(key.capture(), config.capture());
        assertThat(key.getValue()).isEqualTo("chat:rate:typing:7");
        assertThat(config.getValue().get().getBandwidths()[0].getCapacity()).isEqualTo(120);
    }

    @Test
    void aNonPositiveTypingLimitIsRefusedAtStartupToo() {
        assertThatThrownBy(
                        () ->
                                new Bucket4jChatRateLimiter(
                                        buckets, new ChatLimitsProperties(30, 10, 20, 0)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("app.chat.limits.typing-frames-per-minute");
    }
}
