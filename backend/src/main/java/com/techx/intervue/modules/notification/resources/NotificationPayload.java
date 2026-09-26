package com.techx.intervue.modules.notification.resources;

import java.time.Instant;

/**
 * Khung STOMP trên /user/topic/notifications (spec §6). id null với kind không lưu (message, test);
 * conversationId chỉ có với tin nhắn chat.
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
