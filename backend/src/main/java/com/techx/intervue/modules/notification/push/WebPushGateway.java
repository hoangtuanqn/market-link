package com.techx.intervue.modules.notification.push;

import java.security.Security;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Giữ PushService của thư viện web-push khi đã cấu hình khoá VAPID. Không có khoá thì push tắt, app
 * vẫn chạy như trước (giống app.chat.rabbitmq.host rỗng → simple broker).
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

    /** Khoá public cho FE (pushManager.subscribe applicationServerKey); null khi push tắt. */
    public String publicKey() {
        return pushService == null ? null : properties.vapidPublicKey();
    }
}
