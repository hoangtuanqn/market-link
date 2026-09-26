package com.techx.intervue.modules.notification.resources;

import java.time.Instant;

/**
 * The STOMP frame on /user/topic/notifications (spec §6). id is null for kinds that are not stored
 * (message, test); conversationId is only present for chat messages.
 */
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
