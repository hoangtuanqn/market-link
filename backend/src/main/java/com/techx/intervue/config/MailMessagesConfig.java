package com.techx.intervue.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

/** Text of the emails (i18n/mail*.properties), 10 languages like the notifications bundle. */
@Configuration
public class MailMessagesConfig {

    @Bean
    public MessageSource mailMessages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("i18n/mail");
        source.setDefaultEncoding("UTF-8");
        // A missing language → mail.properties (English), not the server's locale
        source.setFallbackToSystemLocale(false);
        // Every line goes through MessageFormat, so an apostrophe is always written '' in the files
        source.setAlwaysUseMessageFormat(true);
        return source;
    }
}
