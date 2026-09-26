package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.entities.Announcement;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.NotificationResource;
import com.techx.intervue.resources.PageResource;
import java.util.Collection;

public interface NotificationServiceInterface {

    /**
     * Store (if the kind needs storing, text translated into each person's language) then push
     * after commit. Call it inside the caller's transaction so the notifications row commits
     * together with the change that caused it.
     */
    void dispatch(Collection<Long> recipients, NotificationEvent event);

    /**
     * FR-077: one row per active user in the audience (a single INSERT … SELECT statement), then
     * push after commit to each person.
     */
    void broadcastAnnouncement(Announcement announcement);

    /** dispatch to every active admin. */
    void notifyAdmins(NotificationEvent event);

    /** Newest first; isRead null = all. page starts at 1. */
    PageResource<NotificationResource> list(Long userId, Boolean isRead, int page, int size);

    long unreadCount(Long userId);

    /** 404 if missing, 403 if someone else's (R-06). */
    void markRead(Long userId, Long notificationId);

    int markAllRead(Long userId);

    /** The "Send test" button: not stored, at most once every 10 seconds. */
    void sendTest(Long userId);
}
