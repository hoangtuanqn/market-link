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
 * FR-042 N3 — gửi Web Push (RFC 8291 aes128gcm + VAPID) tới mọi trình duyệt đã đăng ký của một
 * người. Chạy trên luồng riêng để request gây ra thông báo không phải chờ dịch vụ push. 404/410 =
 * trình duyệt đã huỷ đăng ký → xoá.
 */
@Slf4j
@Component
public class WebPushSender {

    /** Nội dung service worker đọc (public/sw.js); không thêm dữ liệu cá nhân nào khác. */
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

    /** Bất đồng bộ; lỗi chỉ ghi log. */
    public void send(Long userId, NotificationPayload payload) {
        if (!enabled()) return;
        executor.execute(() -> sendNow(userId, payload));
    }

    /** Đồng bộ (test và luồng web-push dùng). */
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
