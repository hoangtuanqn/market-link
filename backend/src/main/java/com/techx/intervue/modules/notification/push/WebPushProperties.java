package com.techx.intervue.modules.notification.push;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.push")
public record WebPushProperties(String vapidPublicKey, String vapidPrivateKey, String subject) {

    public boolean enabled() {
        return vapidPublicKey != null
                && !vapidPublicKey.isBlank()
                && vapidPrivateKey != null
                && !vapidPrivateKey.isBlank();
    }
}
