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

    /** Cách báo kind này cho userId vào lúc now (spec §5). */
    Alert alertFor(Long userId, NotificationKind kind, Instant now);
}
