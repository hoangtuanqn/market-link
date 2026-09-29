package com.techx.intervue.modules.notification.resources;

import com.techx.intervue.modules.notification.enums.NotificationKind;
import java.util.Map;

public record NotificationEvent(
        NotificationKind kind,
        Map<String, String> params,
        String link,
        Long conversationId,
        String title,
        String message,
        String messageKey) {

    public NotificationEvent {
        params = params == null ? Map.of() : Map.copyOf(params);
    }

    public NotificationEvent(
            NotificationKind kind,
            Map<String, String> params,
            String link,
            Long conversationId,
            String title,
            String message) {
        this(kind, params, link, conversationId, title, message, null);
    }

    public static NotificationEvent of(
            NotificationKind kind, String link, Map<String, String> params) {
        return new NotificationEvent(kind, params, link, null, null, null);
    }
}
