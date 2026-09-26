package com.techx.intervue.modules.notification.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

/**
 * A separate bundle for notification text (i18n/notifications*.properties), 10 languages like the
 * frontend.
 */
@Configuration
public class NotificationMessagesConfig {

    @Bean
    public MessageSource notificationMessages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("i18n/notifications");
        source.setDefaultEncoding("UTF-8");
        // A missing language → notifications.properties (English), not the server's locale
        source.setFallbackToSystemLocale(false);
        source.setUseCodeAsDefaultMessage(true);
        return source;
    }
}
