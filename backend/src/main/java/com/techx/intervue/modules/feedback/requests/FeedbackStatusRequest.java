package com.techx.intervue.modules.feedback.requests;

import jakarta.validation.constraints.NotBlank;

public record FeedbackStatusRequest(@NotBlank String status) {}
