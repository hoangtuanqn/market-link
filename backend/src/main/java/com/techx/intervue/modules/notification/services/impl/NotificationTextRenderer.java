package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.RenderedText;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

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
        String title = e.title() != null ? e.title() : lookup(e, key(e, "title"), locale);
        String message =
                e.message() != null
                        ? e.message()
                        : lookup(
                                e,
                                e.messageKey() != null
                                        ? "notification." + e.messageKey()
                                        : key(e, "message"),
                                locale);
        return new RenderedText(cut(title, TITLE_MAX), cut(message, MESSAGE_MAX));
    }

    private static String key(NotificationEvent e, String part) {
        return "notification." + e.kind().code() + "." + part;
    }

    private String lookup(NotificationEvent e, String key, Locale locale) {
        String text = messages.getMessage(key, null, locale);
        for (Map.Entry<String, String> p : e.params().entrySet()) {
            text = text.replace("{" + p.getKey() + "}", p.getValue());
        }
        return text;
    }

    private static String cut(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
