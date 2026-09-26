package com.techx.intervue.modules.notification.resources;

import com.techx.intervue.modules.notification.entities.Notification;
import java.time.Instant;

public record NotificationResource(
        Long id,
        String kind,
        String title,
        String message,
        String link,
        boolean isRead,
        Instant createdAt) {

    public static NotificationResource from(Notification n) {
        return new NotificationResource(
                n.getId(),
                n.getKind().code(),
                n.getTitle(),
                n.getMessage(),
                n.getLink(),
                n.isRead(),
                n.getCreatedAt());
    }
}
