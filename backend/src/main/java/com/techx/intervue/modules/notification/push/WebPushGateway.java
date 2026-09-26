package com.techx.intervue.modules.notification.push;

import java.security.Security;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Holds the web-push library's PushService once VAPID keys are configured. Without keys push is off
 * and the app keeps running as before (like an empty app.chat.rabbitmq.host → simple broker).
 */
@Slf4j
@Component
@EnableConfigurationProperties(WebPushProperties.class)
public class WebPushGateway {

    private final WebPushProperties properties;
    private final PushService pushService;

    public WebPushGateway(WebPushProperties properties) {
        this.properties = properties;
        this.pushService = properties.enabled() ? create(properties) : null;
        log.info("Web Push: {}", pushService != null ? "enabled" : "disabled (no VAPID keys)");
    }

    private static PushService create(WebPushProperties p) {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            String subject =
                    p.subject() == null || p.subject().isBlank()
                            ? "mailto:admin@marketlink.local"
                            : p.subject();
            return new PushService(p.vapidPublicKey(), p.vapidPrivateKey(), subject);
        } catch (Exception e) {
            throw new IllegalStateException("VAPID keys are not valid base64url P-256 keys", e);
        }
    }

    public Optional<PushService> service() {
        return Optional.ofNullable(pushService);
    }

    /**
     * The public key for the FE (pushManager.subscribe applicationServerKey); null when push is
     * off.
     */
    public String publicKey() {
        return pushService == null ? null : properties.vapidPublicKey();
    }
}
