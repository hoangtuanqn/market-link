package com.techx.intervue.modules.feedback.resources;

/** One submission; the {@code user*} fields are null when the sender was not signed in. */
public record FeedbackResource(
        Long id,
        String type,
        String message,
        String status,
        Long userId,
        String userName,
        String userEmail,
        String createdAt) {}
