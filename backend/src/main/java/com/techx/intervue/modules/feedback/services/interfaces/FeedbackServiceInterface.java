package com.techx.intervue.modules.feedback.services.interfaces;

import com.techx.intervue.modules.feedback.requests.CreateFeedbackRequest;
import com.techx.intervue.modules.feedback.resources.FeedbackResource;
import com.techx.intervue.resources.PageResource;

public interface FeedbackServiceInterface {

    FeedbackResource submit(Long userIdOrNull, String clientKey, CreateFeedbackRequest request);

    PageResource<FeedbackResource> listForAdmin(String status, int page, int pageSize);

    FeedbackResource setStatus(long id, String status);
}
