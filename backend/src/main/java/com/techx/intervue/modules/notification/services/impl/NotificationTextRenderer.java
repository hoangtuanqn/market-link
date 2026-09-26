package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.RenderedText;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

/**
 * Notification text in the recipient's language (user_settings.language). Translated on the server
 * because Web Push is shown by the service worker, which has no app translator. Cut to the column
 * size: title 150, message 500.
 */
@Component
public class NotificationTextRenderer {

    private static final int TITLE_MAX = 150;
    private static final int MESSAGE_MAX = 500;

    private final MessageSource messages;

    public NotificationTextRenderer(@Qualifier("notificationMessages") MessageSource messages) {
        this.messages = messages;
    }

    public RenderedText render(NotificationEvent e, String language) {
        Locale locale = Locale.forLanguageTag(language == null ? "en" : language);
        String title = e.title() != null ? e.title() : lookup(e, "title", locale);
        String message = e.message() != null ? e.message() : lookup(e, "message", locale);
        return new RenderedText(cut(title, TITLE_MAX), cut(message, MESSAGE_MAX));
    }

    private String lookup(NotificationEvent e, String part, Locale locale) {
        String text =
                messages.getMessage("notification." + e.kind().code() + "." + part, null, locale);
        for (Map.Entry<String, String> p : e.params().entrySet()) {
            text = text.replace("{" + p.getKey() + "}", p.getValue());
        }
        return text;
    }

    private static String cut(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
