package com.techx.intervue.modules.feedback.services.impl;

import com.techx.intervue.modules.feedback.entities.Feedback;
import com.techx.intervue.modules.feedback.enums.FeedbackStatus;
import com.techx.intervue.modules.feedback.enums.FeedbackType;
import com.techx.intervue.modules.feedback.exceptions.FeedbackNotFoundException;
import com.techx.intervue.modules.feedback.repositories.FeedbackQueryRepository;
import com.techx.intervue.modules.feedback.repositories.FeedbackRepository;
import com.techx.intervue.modules.feedback.requests.CreateFeedbackRequest;
import com.techx.intervue.modules.feedback.resources.FeedbackResource;
import com.techx.intervue.modules.feedback.services.interfaces.FeedbackServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.Instant;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-081. Rate limit first (cheapest, and before any parsing), then validate, then store. */
@Service
@AllArgsConstructor
public class FeedbackService implements FeedbackServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MIN_MESSAGE = 10;
    private static final int MAX_MESSAGE = 2000;

    private final FeedbackRepository feedbacks;
    private final FeedbackQueryRepository queries;
    private final FeedbackRateLimiter rateLimiter;
    private final Clock clock;

    @Override
    @Transactional
    public FeedbackResource submit(
            Long userIdOrNull, String clientKey, CreateFeedbackRequest request) {
        rateLimiter.check(clientKey);
        FeedbackType type;
        try {
            type = FeedbackType.parse(request.type());
        } catch (IllegalArgumentException e) {
            throw new InvalidFieldException("type", e.getMessage());
        }
        String message = request.message() == null ? "" : request.message().trim();
        if (message.length() < MIN_MESSAGE || message.length() > MAX_MESSAGE) {
            throw new InvalidFieldException(
                    "message", "Tell us a little more (10–2000 characters).");
        }
        Feedback row = new Feedback();
        row.setUserId(userIdOrNull);
        row.setType(type);
        row.setMessage(message);
        row.setCreatedAt(Instant.now(clock));
        Feedback saved = feedbacks.save(row);
        return queries.findOne(saved.getId())
                .orElseGet(
                        () ->
                                new FeedbackResource(
                                        saved.getId(),
                                        type.value(),
                                        message,
                                        saved.getStatus().value(),
                                        userIdOrNull,
                                        null,
                                        null,
                                        saved.getCreatedAt().toString()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<FeedbackResource> listForAdmin(String status, int page, int pageSize) {
        String dbStatus =
                status == null || status.isBlank() ? null : FeedbackStatus.parse(status).value();
        return queries.list(
                dbStatus, Math.max(1, page), Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)));
    }

    @Override
    @Transactional
    public FeedbackResource setStatus(long id, String status) {
        FeedbackStatus target = FeedbackStatus.parse(status);
        Feedback row = feedbacks.findById(id).orElseThrow(FeedbackNotFoundException::new);
        row.setStatus(target);
        feedbacks.saveAndFlush(row);
        return queries.findOne(id).orElseThrow(FeedbackNotFoundException::new);
    }
}
