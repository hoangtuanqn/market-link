package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.notification.entities.Notification;
import com.techx.intervue.modules.notification.repositories.NotificationRepository;
import com.techx.intervue.modules.notification.resources.Alert;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.NotificationPayload;
import com.techx.intervue.modules.notification.resources.RenderedText;
import com.techx.intervue.modules.notification.services.interfaces.NotificationDeliveryInterface;
import com.techx.intervue.modules.notification.services.interfaces.NotificationPreferenceServiceInterface;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spec §2: mọi nguồn thông báo đi qua dispatch. Lưu trong transaction của người gọi; đẩy sau commit
 * để FE không nhận khung về một dòng chưa tồn tại. Lỗi đẩy của một người không chặn người khác.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationServiceInterface {

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
    public void notifyAdmins(NotificationEvent event) {
        dispatch(notifications.activeAdminIds(), event);
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
