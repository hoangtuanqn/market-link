package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.entities.Announcement;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.NotificationResource;
import com.techx.intervue.resources.PageResource;
import java.util.Collection;

public interface NotificationServiceInterface {

    /**
     * Lưu (nếu kind cần lưu, text dịch theo ngôn ngữ từng người) rồi đẩy sau commit. Gọi trong
     * transaction của người gọi để dòng notifications cùng commit với thay đổi gây ra nó.
     */
    void dispatch(Collection<Long> recipients, NotificationEvent event);

    /**
     * FR-077: một dòng cho mỗi user active thuộc audience (một câu INSERT … SELECT), rồi đẩy sau
     * commit cho từng người.
     */
    void broadcastAnnouncement(Announcement announcement);

    /** dispatch tới mọi admin đang active. */
    void notifyAdmins(NotificationEvent event);

    /** Mới nhất trước; isRead null = tất cả. page bắt đầu từ 1. */
    PageResource<NotificationResource> list(Long userId, Boolean isRead, int page, int size);

    long unreadCount(Long userId);

    /** 404 nếu không có, 403 nếu của người khác (R-06). */
    void markRead(Long userId, Long notificationId);

    int markAllRead(Long userId);

    /** Nút "Gửi thử": không lưu, tối đa một lần mỗi 10 giây. */
    void sendTest(Long userId);
}
