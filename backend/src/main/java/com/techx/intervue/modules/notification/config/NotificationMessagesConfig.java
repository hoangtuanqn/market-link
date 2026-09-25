package com.techx.intervue.modules.notification.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

/** Bundle riêng cho text thông báo (i18n/notifications*.properties), 10 ngôn ngữ như frontend. */
@Configuration
public class NotificationMessagesConfig {

    @Bean
    public MessageSource notificationMessages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("i18n/notifications");
        source.setDefaultEncoding("UTF-8");
        // Ngôn ngữ thiếu → notifications.properties (English), không theo locale của máy chủ
        source.setFallbackToSystemLocale(false);
        source.setUseCodeAsDefaultMessage(true);
        return source;
    }
}
