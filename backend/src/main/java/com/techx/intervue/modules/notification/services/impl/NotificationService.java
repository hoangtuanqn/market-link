package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.notification.entities.Announcement;
import com.techx.intervue.modules.notification.entities.Notification;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.exceptions.NotificationAccessDeniedException;
import com.techx.intervue.modules.notification.exceptions.TestNotificationTooSoonException;
import com.techx.intervue.modules.notification.repositories.NotificationRepository;
import com.techx.intervue.modules.notification.resources.Alert;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.NotificationPayload;
import com.techx.intervue.modules.notification.resources.NotificationResource;
import com.techx.intervue.modules.notification.resources.RenderedText;
import com.techx.intervue.modules.notification.services.interfaces.NotificationDeliveryInterface;
import com.techx.intervue.modules.notification.services.interfaces.NotificationPreferenceServiceInterface;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import com.techx.intervue.resources.PageResource;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spec §2: every notification source goes through dispatch. Stored in the caller's transaction;
 * pushed after commit so the FE does not receive a frame about a row that does not exist yet. A
 * push failure for one person does not block others.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationServiceInterface {

    static final String TEST_KEY = "notif:test:";
    private static final Duration TEST_COOLDOWN = Duration.ofSeconds(10);

    private final NotificationRepository notifications;
    private final NotificationPreferenceServiceInterface prefs;
    private final NotificationDeliveryInterface delivery;
    private final UserSettingsRepository userSettings;
    private final NotificationTextRenderer renderer;
    private final StringRedisTemplate redis;
    private final Clock clock;

    @Override
    @Transactional
    public void dispatch(Collection<Long> recipients, NotificationEvent event) {
        List<Long> unique = List.copyOf(new LinkedHashSet<>(recipients));
        if (unique.isEmpty()) {
            return;
        }
        Map<Long, String> languages =
                userSettings.findAllById(unique).stream()
                        .filter(s -> s.getLanguage() != null)
                        .collect(
                                Collectors.toMap(
                                        UserSettings::getUserId, UserSettings::getLanguage));
        for (Long userId : unique) {
            RenderedText text = renderer.render(event, languages.getOrDefault(userId, "en"));
            Notification saved =
                    event.kind().persistent()
                            ? notifications.save(
                                    Notification.builder()
                                            .userId(userId)
                                            .kind(event.kind())
                                            .title(text.title())
                                            .message(text.message())
                                            .link(event.link())
                                            .build())
                            : null;
            Long id = saved == null ? null : saved.getId();
            Instant createdAt =
                    saved == null || saved.getCreatedAt() == null
                            ? clock.instant()
                            : saved.getCreatedAt();
            TransactionHelper.afterCommit(() -> push(userId, event, text, id, createdAt));
        }
    }

    @Override
    @Transactional
    public void broadcastAnnouncement(Announcement a) {
        notifications.fanOutAnnouncement(
                a.getId(), a.getTitle(), a.getContent(), a.getAudience().roleCodes());
        TransactionHelper.afterCommit(() -> pushAnnouncement(a));
    }

    private void pushAnnouncement(Announcement a) {
        List<NotificationRepository.Recipient> recipients = notifications.recipientsOf(a.getId());
        if (recipients.isEmpty()) {
            return;
        }
        Map<Long, Long> unread =
                notifications
                        .unreadCounts(
                                recipients.stream()
                                        .map(NotificationRepository.Recipient::getUserId)
                                        .toList())
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        NotificationRepository.UnreadRow::getUserId,
                                        NotificationRepository.UnreadRow::getTotal));
        Instant now = clock.instant();
        for (NotificationRepository.Recipient r : recipients) {
            try {
                delivery.deliver(
                        r.getUserId(),
                        new NotificationPayload(
                                r.getId(),
                                NotificationKind.ANNOUNCEMENT.code(),
                                a.getTitle(),
                                a.getContent(),
                                r.getLink(),
                                r.getCreatedAt(),
                                true,
                                unread.getOrDefault(r.getUserId(), 0L),
                                prefs.alertFor(r.getUserId(), NotificationKind.ANNOUNCEMENT, now),
                                null));
            } catch (RuntimeException e) {
                log.warn("Announcement push to user {} failed: {}", r.getUserId(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void notifyAdmins(NotificationEvent event) {
        dispatch(notifications.activeAdminIds(), event);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<NotificationResource> list(
            Long userId, Boolean isRead, int page, int size) {
        Pageable pageable = PageRequest.of(page - 1, size);
        Page<Notification> result =
                isRead == null
                        ? notifications.findByUserIdOrderByCreatedAtDescIdDesc(userId, pageable)
                        : notifications.findByUserIdAndReadOrderByCreatedAtDescIdDesc(
                                userId, isRead, pageable);
        return PageResource.<NotificationResource>builder()
                .items(result.map(NotificationResource::from).getContent())
                .page(page)
                .pageSize(size)
                .total(result.getTotalElements())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notifications.countByUserIdAndReadFalse(userId);
    }

    @Override
    @Transactional
    public void markRead(Long userId, Long notificationId) {
        Notification n =
                notifications
                        .findById(notificationId)
                        .orElseThrow(() -> new EntityNotFoundException("Notification not found."));
        if (!n.getUserId().equals(userId)) {
            throw new NotificationAccessDeniedException();
        }
        n.setRead(true);
    }

    @Override
    @Transactional
    public int markAllRead(Long userId) {
        return notifications.markAllRead(userId);
    }

    @Override
    public void sendTest(Long userId) {
        Boolean first = redis.opsForValue().setIfAbsent(TEST_KEY + userId, "1", TEST_COOLDOWN);
        if (!Boolean.TRUE.equals(first)) {
            throw new TestNotificationTooSoonException();
        }
        dispatch(
                List.of(userId),
                NotificationEvent.of(NotificationKind.TEST, "/settings", Map.of()));
    }

    private void push(
            Long userId, NotificationEvent event, RenderedText text, Long id, Instant createdAt) {
        try {
            Alert alert = prefs.alertFor(userId, event.kind(), clock.instant());
            long unread = notifications.countByUserIdAndReadFalse(userId);
            delivery.deliver(
                    userId,
                    new NotificationPayload(
                            id,
                            event.kind().code(),
                            text.title(),
                            text.message(),
                            event.link(),
                            createdAt,
                            event.kind().persistent(),
                            unread,
                            alert,
                            event.conversationId()));
        } catch (RuntimeException e) {
            log.warn("Notification push to user {} failed: {}", userId, e.getMessage());
        }
    }
}
