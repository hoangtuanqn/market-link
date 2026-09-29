package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.entities.Announcement;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.NotificationResource;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.resources.PageResource;
import java.util.Collection;

public interface NotificationServiceInterface {

    void dispatch(Collection<Long> recipients, NotificationEvent event);

    void broadcastAnnouncement(Announcement announcement);

    void notifyAdmins(NotificationEvent event);

    PageResource<NotificationResource> list(Long userId, Boolean isRead, int page, int size);

    long unreadCount(Long userId);

    void markRead(Long userId, Long notificationId);

    int markAllRead(Long userId);

    void sendTest(Long userId, RoleType role);
}
