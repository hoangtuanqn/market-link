package com.techx.intervue.modules.notification.push;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * FR-042 N3 — khoá VAPID (RFC 8292). publicKey: base64url điểm P-256 không nén (65 byte);
 * privateKey: base64url 32 byte; subject: mailto: để dịch vụ push liên hệ. Thiếu một trong hai khoá
 * → Web Push tắt.
 */
@ConfigurationProperties(prefix = "app.push")
public record WebPushProperties(String vapidPublicKey, String vapidPrivateKey, String subject) {

    public boolean enabled() {
        return vapidPublicKey != null
                && !vapidPublicKey.isBlank()
                && vapidPrivateKey != null
                && !vapidPrivateKey.isBlank();
    }
}
