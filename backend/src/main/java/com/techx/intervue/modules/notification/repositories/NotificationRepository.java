package com.techx.intervue.modules.notification.repositories;

import com.techx.intervue.modules.notification.entities.Notification;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

    Page<Notification> findByUserIdAndReadOrderByCreatedAtDescIdDesc(
            Long userId, boolean read, Pageable pageable);

    long countByUserIdAndReadFalse(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Notification n set n.read = true where n.userId = :userId and n.read = false")
    int markAllRead(@Param("userId") Long userId);

    /**
     * FR-077: one statement for the whole audience — active users, the right role; link by each
     * role's area.
     */
    @Modifying(flushAutomatically = true)
    @Query(
            nativeQuery = true,
            value =
                    """
                    INSERT INTO notifications (user_id, kind, title, message, link, announcement_id)
                    SELECT u.id, 'announcement', :title, :message,
                           CASE u.role WHEN 'farmer' THEN '/farmer/notifications'
                                       ELSE '/notifications' END,
                           :announcementId
                    FROM users u
                    WHERE u.status = 'active' AND u.role IN (:roles)""")
    int fanOutAnnouncement(
            @Param("announcementId") Long announcementId,
            @Param("title") String title,
            @Param("message") String message,
            @Param("roles") Collection<String> roles);

    interface Recipient {
        Long getUserId();

        Long getId();

        String getLink();

        Instant getCreatedAt();
    }

    @Query(
            nativeQuery = true,
            value =
                    "SELECT user_id AS userId, id, link, created_at AS createdAt"
                            + " FROM notifications WHERE announcement_id = :id")
    List<Recipient> recipientsOf(@Param("id") Long announcementId);

    interface UnreadRow {
        Long getUserId();

        long getTotal();
    }

    @Query(
            "select n.userId as userId, count(n) as total from Notification n"
                    + " where n.read = false and n.userId in :ids group by n.userId")
    List<UnreadRow> unreadCounts(@Param("ids") Collection<Long> userIds);

    @Query(
            nativeQuery = true,
            value = "SELECT id FROM users WHERE role = 'admin' AND status = 'active'")
    List<Long> activeAdminIds();
}
