package com.techx.intervue.modules.feedback.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.feedback.entities.Feedback;
import com.techx.intervue.modules.feedback.enums.FeedbackStatus;
import com.techx.intervue.modules.feedback.enums.FeedbackType;
import com.techx.intervue.modules.feedback.exceptions.FeedbackRateLimitedException;
import com.techx.intervue.modules.feedback.repositories.FeedbackQueryRepository;
import com.techx.intervue.modules.feedback.repositories.FeedbackRepository;
import com.techx.intervue.modules.feedback.requests.CreateFeedbackRequest;
import com.techx.intervue.modules.feedback.resources.FeedbackResource;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.BucketProxy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.distributed.proxy.RemoteBucketBuilder;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * FR-081. The form is public, so the only guard against abuse is the per-IP bucket (5 an hour) —
 * the bucket4j proxy is mocked the same way as in {@code Bucket4jChatRateLimiterTest}.
 */
class FeedbackServiceTest {

    private static final String IP = "203.0.113.7";

    private FeedbackRepository feedbacks;
    private FeedbackQueryRepository queries;
    private RemoteBucketBuilder<String> builder;
    private BucketProxy bucket;
    private FeedbackService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        feedbacks = mock(FeedbackRepository.class);
        queries = mock(FeedbackQueryRepository.class);
        ProxyManager<String> buckets = mock(ProxyManager.class);
        builder = mock(RemoteBucketBuilder.class);
        bucket = mock(BucketProxy.class);
        when(buckets.builder()).thenReturn(builder);
        when(builder.build(any(String.class), any(Supplier.class))).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(true);
        Clock clock =
                Clock.fixed(
                        ZonedDateTime.of(2026, 9, 26, 9, 0, 0, 0, ZoneId.of("Asia/Ho_Chi_Minh"))
                                .toInstant(),
                        ZoneId.of("Asia/Ho_Chi_Minh"));
        when(feedbacks.save(any()))
                .thenAnswer(
                        inv -> {
                            Feedback f = inv.getArgument(0);
                            f.setId(31L);
                            return f;
                        });
        when(queries.findOne(31L))
                .thenReturn(
                        Optional.of(
                                new FeedbackResource(
                                        31L,
                                        "bug",
                                        "x",
                                        "new",
                                        null,
                                        null,
                                        null,
                                        "2026-09-26T02:00:00Z")));
        service = new FeedbackService(feedbacks, queries, new FeedbackRateLimiter(buckets), clock);
    }

    @Test
    void acceptsAnonymousFeedback() {
        FeedbackResource saved = service.submit(null, IP, request("bug"));

        ArgumentCaptor<Feedback> row = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbacks).save(row.capture());
        assertThat(row.getValue().getUserId()).isNull();
        assertThat(row.getValue().getType()).isEqualTo(FeedbackType.BUG);
        assertThat(row.getValue().getStatus()).isEqualTo(FeedbackStatus.NEW);
        assertThat(saved.id()).isEqualTo(31L);
    }

    @Test
    void attachesTheUserIdWhenSignedIn() {
        service.submit(7L, IP, request("suggestion"));

        ArgumentCaptor<Feedback> row = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbacks).save(row.capture());
        assertThat(row.getValue().getUserId()).isEqualTo(7L);
        assertThat(row.getValue().getType()).isEqualTo(FeedbackType.SUGGESTION);
    }

    @Test
    void rejectsAnUnknownType() {
        assertThatThrownBy(() -> service.submit(null, IP, request("spam")))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("type");
        verify(feedbacks, never()).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void rateLimitsToFiveSubmissionsPerHourPerIp() {
        when(bucket.tryConsume(1)).thenReturn(true, true, true, true, true, false);

        for (int i = 0; i < 5; i++) {
            service.submit(null, IP, request("query"));
        }
        assertThatThrownBy(() -> service.submit(null, IP, request("query")))
                .isInstanceOf(FeedbackRateLimitedException.class);
        verify(feedbacks, times(5)).save(any());

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Supplier<BucketConfiguration>> config =
                ArgumentCaptor.forClass(Supplier.class);
        verify(builder, times(6)).build(key.capture(), config.capture());
        assertThat(key.getValue()).isEqualTo("feedback:rate:" + IP);
        BucketConfiguration c = config.getValue().get();
        assertThat(c.getBandwidths()[0].getCapacity()).isEqualTo(5);
        assertThat(c.getBandwidths()[0].getRefillPeriodNanos())
                .isEqualTo(Duration.ofHours(1).toNanos());
    }

    @Test
    void adminStatusChangeAcceptsOnlyTheThreeKnownValues() {
        Feedback stored = new Feedback();
        stored.setId(31L);
        stored.setType(FeedbackType.BUG);
        stored.setMessage("The map does not load on Firefox.");
        when(feedbacks.findById(31L)).thenReturn(Optional.of(stored));

        service.setStatus(31L, "resolved");
        assertThat(stored.getStatus()).isEqualTo(FeedbackStatus.RESOLVED);

        assertThatThrownBy(() -> service.setStatus(31L, "done"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static CreateFeedbackRequest request(String type) {
        return new CreateFeedbackRequest(type, "The map does not load on Firefox 130.");
    }
}
