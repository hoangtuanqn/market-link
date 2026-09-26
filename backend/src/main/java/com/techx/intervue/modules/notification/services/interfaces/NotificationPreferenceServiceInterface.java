package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.requests.UpdateNotificationPreferencesRequest;
import com.techx.intervue.modules.notification.resources.Alert;
import com.techx.intervue.modules.notification.resources.NotificationPreferencesResource;
import java.time.Instant;

public interface NotificationPreferenceServiceInterface {

    NotificationPreferencesResource get(Long userId);

    NotificationPreferencesResource update(
            Long userId, UpdateNotificationPreferencesRequest request);

    /** How to alert this kind to userId at time now (spec §5). */
    Alert alertFor(Long userId, NotificationKind kind, Instant now);
}
