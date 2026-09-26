package com.techx.intervue.modules.notification.resources;

import com.techx.intervue.modules.notification.enums.NotificationKind;
import java.util.Map;

/**
 * An event that needs to be announced. If title / message are provided they are kept as is (chat
 * message, admin announcement); if null they are translated from the key
 * notification.&lt;kind&gt;.title|message in the recipient's language, replacing {name} with
 * params. conversationId is only present for messages, so the FE does not pop up while the right
 * thread is open.
 */
public record NotificationEvent(
        NotificationKind kind,
        Map<String, String> params,
        String link,
        Long conversationId,
        String title,
        String message) {

    public NotificationEvent {
        params = params == null ? Map.of() : Map.copyOf(params);
    }

    public static NotificationEvent of(
            NotificationKind kind, String link, Map<String, String> params) {
        return new NotificationEvent(kind, params, link, null, null, null);
    }
}
