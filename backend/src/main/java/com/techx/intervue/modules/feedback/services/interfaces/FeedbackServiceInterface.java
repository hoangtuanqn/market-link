package com.techx.intervue.modules.feedback.services.interfaces;

import com.techx.intervue.modules.feedback.requests.CreateFeedbackRequest;
import com.techx.intervue.modules.feedback.resources.FeedbackResource;
import com.techx.intervue.resources.PageResource;

/** FR-081 — public form + admin queue (contract §11). */
public interface FeedbackServiceInterface {

    /**
     * {@code userIdOrNull}: the signed-in sender, if any; {@code clientKey}: the caller's address.
     */
    FeedbackResource submit(Long userIdOrNull, String clientKey, CreateFeedbackRequest request);

    PageResource<FeedbackResource> listForAdmin(String status, int page, int pageSize);

    FeedbackResource setStatus(long id, String status);
}
