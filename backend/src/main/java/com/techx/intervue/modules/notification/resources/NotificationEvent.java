package com.techx.intervue.modules.notification.resources;

import com.techx.intervue.modules.notification.enums.NotificationKind;
import java.util.Map;

/**
 * An event that needs to be announced. If title / message are provided they are kept as is (chat
 * message, admin announcement); if null they are translated from the key
 * notification.&lt;kind&gt;.title|message in the recipient's language, replacing {name} with
 * params. conversationId is only present for messages, so the FE does not pop up while the right
 * thread is open. messageKey (after "notification.") replaces the kind's own message key when one
 * kind has several wordings: a chat video says "sent a video", not "sent a photo".
 */
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
