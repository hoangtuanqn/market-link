package com.techx.intervue.modules.notification.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.notification.push.PushSubscriptionService;
import com.techx.intervue.modules.notification.push.WebPushGateway;
import com.techx.intervue.modules.notification.requests.PushSubscriptionRequest;
import com.techx.intervue.modules.notification.requests.PushUnsubscribeRequest;
import com.techx.intervue.modules.notification.requests.UpdateNotificationPreferencesRequest;
import com.techx.intervue.modules.notification.resources.NotificationPreferencesResource;
import com.techx.intervue.modules.notification.resources.NotificationResource;
import com.techx.intervue.modules.notification.services.interfaces.NotificationPreferenceServiceInterface;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.HashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-042 — thông báo của người đang đăng nhập (mọi vai). Mọi route cần đăng nhập. */
@Validated
@RestController
@RequestMapping("/api/v1/notifications")
@AllArgsConstructor
public class NotificationController extends BaseController {

    private final NotificationServiceInterface notifications;
    private final NotificationPreferenceServiceInterface preferences;
    private final WebPushGateway webPush;
    private final PushSubscriptionService pushSubscriptions;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<NotificationResource>>> list(
            @RequestParam(required = false) Boolean isRead,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(notifications.list(me.getId(), isRead, page, size), "OK");
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResource<Map<String, Long>>> unreadCount(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(Map.of("count", notifications.unreadCount(me.getId())), "OK");
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResource<Void>> markRead(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        notifications.markRead(me.getId(), id);
        return ok(null, "Marked as read.");
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResource<Map<String, Integer>>> markAllRead(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(Map.of("updated", notifications.markAllRead(me.getId())), "All marked as read.");
    }

    @GetMapping("/preferences")
    public ResponseEntity<ApiResource<NotificationPreferencesResource>> preferences(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(preferences.get(me.getId()), "OK");
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResource<NotificationPreferencesResource>> savePreferences(
            @Valid @RequestBody UpdateNotificationPreferencesRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(preferences.update(me.getId(), request), "Notification settings saved.");
    }

    @PostMapping("/test")
    public ResponseEntity<ApiResource<Void>> test(@AuthenticationPrincipal CustomUserDetails me) {
        notifications.sendTest(me.getId());
        return ok(null, "Test notification sent.");
    }

    /** N3: khoá VAPID public cho pushManager.subscribe; null khi server chưa bật Web Push. */
    @GetMapping("/push/public-key")
    public ResponseEntity<ApiResource<Map<String, String>>> pushPublicKey() {
        Map<String, String> body = new HashMap<>();
        body.put("publicKey", webPush.publicKey());
        return ok(body, "OK");
    }

    /** N3: trình duyệt này nhận Web Push cho tài khoản đang đăng nhập. */
    @PostMapping("/push-subscriptions")
    public ResponseEntity<ApiResource<Void>> subscribePush(
            @Valid @RequestBody PushSubscriptionRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @AuthenticationPrincipal CustomUserDetails me) {
        pushSubscriptions.subscribe(me.getId(), request, userAgent);
        return ok(null, "Push notifications are on for this browser.");
    }

    /** N3: gọi khi đăng xuất hoặc tắt thông báo trình duyệt. */
    @DeleteMapping("/push-subscriptions")
    public ResponseEntity<ApiResource<Void>> unsubscribePush(
            @Valid @RequestBody PushUnsubscribeRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        pushSubscriptions.unsubscribe(me.getId(), request.endpoint());
        return ok(null, "Push notifications are off for this browser.");
    }
}
