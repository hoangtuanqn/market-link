package com.techx.intervue.modules.notification.push;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * FR-042 N3 — VAPID keys (RFC 8292). publicKey: base64url of an uncompressed P-256 point (65
 * bytes); privateKey: base64url 32 bytes; subject: mailto: for the push service to make contact. If
 * either key is missing → Web Push is off.
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
