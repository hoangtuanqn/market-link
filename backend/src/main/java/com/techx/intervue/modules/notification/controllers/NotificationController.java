package com.techx.intervue.modules.notification.controllers;

import com.techx.intervue.controllers.BaseController;
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
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
}
