package com.techx.intervue.modules.notification.resources;

import com.techx.intervue.modules.notification.enums.NotificationKind;
import java.util.Map;

/**
 * Một sự kiện cần báo. title / message có sẵn thì giữ nguyên (tin nhắn chat, thông báo admin); null
 * thì dịch từ key notification.&lt;kind&gt;.title|message theo ngôn ngữ người nhận, thay {name}
 * bằng params. conversationId chỉ có với tin nhắn, để FE không popup khi đang mở đúng thread.
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
