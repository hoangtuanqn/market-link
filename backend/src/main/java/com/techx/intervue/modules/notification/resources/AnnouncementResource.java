package com.techx.intervue.modules.notification.resources;

import com.techx.intervue.modules.notification.entities.Announcement;
import java.time.Instant;

public record AnnouncementResource(
        Long id,
        String title,
        String content,
        String audience,
        boolean active,
        Instant startsAt,
        Instant endsAt,
        Instant createdAt) {

    public static AnnouncementResource from(Announcement a) {
        return new AnnouncementResource(
                a.getId(),
                a.getTitle(),
                a.getContent(),
                a.getAudience().code(),
                a.isActive(),
                a.getStartsAt(),
                a.getEndsAt(),
                a.getCreatedAt());
    }
}
