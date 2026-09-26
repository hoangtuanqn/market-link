package com.techx.intervue.modules.feedback.requests;

import jakarta.validation.constraints.NotBlank;

/** {@code PATCH /admin/feedbacks/{id}/status}: new | reviewed | resolved. */
public record FeedbackStatusRequest(@NotBlank String status) {}
