package com.techx.intervue.modules.notification.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.notification.entities.PushSubscription;
import com.techx.intervue.modules.notification.repositories.PushSubscriptionRepository;
import com.techx.intervue.modules.notification.resources.NotificationPayload;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.springframework.stereotype.Component;

/**
 * FR-042 N3 — sends Web Push (RFC 8291 aes128gcm + VAPID) to every registered browser of one
 * person. Runs on its own thread so the request that caused the notification does not wait for the
 * push service. 404/410 = the browser unsubscribed → delete.
 */
@Slf4j
@Component
public class WebPushSender {

    /** The content the service worker reads (public/sw.js); no other personal data is added. */
    record PushMessage(String kind, String title, String message, String link, String tag) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    private final WebPushGateway gateway;
    private final PushSubscriptionRepository subscriptions;
    private final Clock clock;
    private final ExecutorService executor =
            Executors.newFixedThreadPool(
                    2,
                    r -> {
                        Thread t = new Thread(r, "web-push");
                        t.setDaemon(true);
                        return t;
                    });

    public WebPushSender(
            WebPushGateway gateway, PushSubscriptionRepository subscriptions, Clock clock) {
        this.gateway = gateway;
        this.subscriptions = subscriptions;
        this.clock = clock;
    }

    public boolean enabled() {
        return gateway.service().isPresent();
    }

    /** Asynchronous; errors are only logged. */
    public void send(Long userId, NotificationPayload payload) {
        if (!enabled()) return;
        executor.execute(() -> sendNow(userId, payload));
    }

    /** Synchronous (used by tests and the web-push flow). */
    public void sendNow(Long userId, NotificationPayload payload) {
        PushService push = gateway.service().orElse(null);
        if (push == null) return;
        byte[] body;
        try {
            body = JSON.writeValueAsString(message(payload)).getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Web Push payload for user {} could not be built: {}", userId, e.getMessage());
            return;
        }
        for (PushSubscription s : subscriptions.findByUserId(userId)) {
            deliver(push, s, body);
        }
    }

    private void deliver(PushService push, PushSubscription s, byte[] body) {
        try {
            int status =
                    push.send(
                                    new Notification(
                                            s.getEndpoint(), s.getP256dh(), s.getAuth(), body),
                                    Encoding.AES128GCM)
                            .getStatusLine()
                            .getStatusCode();
            if (status == 404 || status == 410) {
                subscriptions.deleteById(s.getId());
            } else if (status >= 200 && status < 300) {
                s.setLastUsedAt(clock.instant());
                subscriptions.save(s);
            } else {
                log.warn("Web Push to subscription {} answered {}", s.getId(), status);
            }
        } catch (Exception e) {
            log.warn("Web Push to subscription {} failed: {}", s.getId(), e.getMessage());
        }
    }

    static PushMessage message(NotificationPayload p) {
        String key =
                p.id() != null
                        ? String.valueOf(p.id())
                        : p.conversationId() != null
                                ? "c" + p.conversationId()
                                : String.valueOf(p.createdAt());
        return new PushMessage(
                p.kind(),
                p.title(),
                p.message(),
                p.link() == null ? "/" : p.link(),
                p.kind() + ":" + key);
    }
}
