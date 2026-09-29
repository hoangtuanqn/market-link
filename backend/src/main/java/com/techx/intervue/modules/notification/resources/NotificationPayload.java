package com.techx.intervue.modules.notification.resources;

import java.time.Instant;

public record NotificationPayload(
        Long id,
        String kind,
        String title,
        String message,
        String link,
        Instant createdAt,
        boolean persistent,
        long unreadCount,
        Alert alert,
        Long conversationId) {}
