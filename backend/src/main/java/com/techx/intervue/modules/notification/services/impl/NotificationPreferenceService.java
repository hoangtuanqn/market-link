package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.modules.notification.entities.NotificationPreference;
import com.techx.intervue.modules.notification.entities.NotificationSettings;
import com.techx.intervue.modules.notification.enums.NotificationCategory;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.exceptions.InvalidNotificationPreferenceException;
import com.techx.intervue.modules.notification.repositories.NotificationPreferenceRepository;
import com.techx.intervue.modules.notification.repositories.NotificationSettingsRepository;
import com.techx.intervue.modules.notification.requests.UpdateNotificationPreferencesRequest;
import com.techx.intervue.modules.notification.resources.Alert;
import com.techx.intervue.modules.notification.resources.NotificationPreferencesResource;
import com.techx.intervue.modules.notification.resources.NotificationPreferencesResource.CategoryPreference;
import com.techx.intervue.modules.notification.services.interfaces.NotificationPreferenceServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Settings → Notifications. No row = default (everything on, sound on, no quiet hours). Quiet hours
 * only block popups, sound and push; storing and the unread count do not change.
 */
@Service
@RequiredArgsConstructor
public class NotificationPreferenceService implements NotificationPreferenceServiceInterface {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final NotificationPreferenceRepository prefs;
    private final NotificationSettingsRepository settings;
    private final UserRepository users;

    @Override
    @Transactional(readOnly = true)
    public NotificationPreferencesResource get(Long userId) {
        RoleType role = roleOf(userId);
        Map<String, NotificationPreference> saved =
                prefs.findByUserId(userId).stream()
                        .collect(
                                Collectors.toMap(
                                        NotificationPreference::getCategory, Function.identity()));
        NotificationSettings s = settingsOf(userId);
        List<CategoryPreference> rows =
                NotificationCategory.forRole(role).stream()
                        .map(
                                c -> {
                                    NotificationPreference p = saved.get(c.code());
                                    return new CategoryPreference(
                                            c.code(),
                                            p == null || p.isInApp(),
                                            p == null || p.isBrowser());
                                })
                        .toList();
        return new NotificationPreferencesResource(
                rows, s.isSound(), s.isQuietOn(), s.getQuietFrom(), s.getQuietTo());
    }

    @Override
    @Transactional
    public NotificationPreferencesResource update(
            Long userId, UpdateNotificationPreferencesRequest request) {
        RoleType role = roleOf(userId);
        List<NotificationPreference> rows =
                request.categories().stream()
                        .map(
                                c -> {
                                    NotificationCategory category =
                                            NotificationCategory.fromCode(c.category())
                                                    .filter(x -> x.visibleTo(role))
                                                    .orElseThrow(
                                                            () ->
                                                                    new InvalidNotificationPreferenceException(
                                                                            "Unknown notification group: "
                                                                                    + c
                                                                                            .category()));
                                    return new NotificationPreference(
                                            userId, category.code(), c.inApp(), c.browser());
                                })
                        .toList();
        prefs.saveAll(rows);
        settings.save(
                new NotificationSettings(
                        userId,
                        request.sound(),
                        request.quietOn(),
                        request.quietFrom(),
                        request.quietTo()));
        return get(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Alert alertFor(Long userId, NotificationKind kind, Instant now) {
        if (kind == NotificationKind.TEST) {
            return new Alert(true, true, true);
        }
        NotificationSettings s = settingsOf(userId);
        if (s.isQuietOn()
                && inQuietHours(s.getQuietFrom(), s.getQuietTo(), LocalTime.ofInstant(now, ZONE))) {
            return new Alert(false, false, false);
        }
        NotificationPreference p =
                prefs.findByUserIdAndCategory(userId, kind.category().code()).orElse(null);
        boolean inApp = p == null || p.isInApp();
        boolean browser = p == null || p.isBrowser();
        return new Alert(inApp, browser, s.isSound() && (inApp || browser));
    }

    /**
     * The interval [from, to); it crosses midnight when from &gt; to; from == to means no quiet
     * hours.
     */
    public static boolean inQuietHours(String from, String to, LocalTime t) {
        LocalTime start = LocalTime.parse(from);
        LocalTime end = LocalTime.parse(to);
        if (start.equals(end)) {
            return false;
        }
        return start.isBefore(end)
                ? !t.isBefore(start) && t.isBefore(end)
                : !t.isBefore(start) || t.isBefore(end);
    }

    private NotificationSettings settingsOf(Long userId) {
        return settings.findById(userId).orElse(NotificationSettings.defaults(userId));
    }

    private RoleType roleOf(Long userId) {
        return users.findById(userId)
                .map(User::getRole)
                .orElseThrow(() -> new EntityNotFoundException("User not found."));
    }
}
