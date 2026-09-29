package com.techx.intervue.modules.feedback.resources;

public record FeedbackResource(
        Long id,
        String type,
        String message,
        String status,
        Long userId,
        String userName,
        String userEmail,
        String createdAt) {}
