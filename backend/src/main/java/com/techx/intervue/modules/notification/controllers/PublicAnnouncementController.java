package com.techx.intervue.modules.notification.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.notification.resources.AnnouncementResource;
import com.techx.intervue.modules.notification.services.interfaces.AnnouncementServiceInterface;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-077 — banner thông báo ở trang public (khách vãng lai cũng đọc được). */
@RestController
@RequestMapping("/api/v1/announcements")
@AllArgsConstructor
public class PublicAnnouncementController extends BaseController {

    private static final String ROLE_PREFIX = "ROLE_";

    private final AnnouncementServiceInterface announcements;

    /**
     * data null khi không có thông báo nào đang hiệu lực cho người xem. Gửi kèm access token thì
     * banner lọc theo role của phiên (bài "chỉ Farmer" không hiện cho Customer); không gửi thì chỉ
     * thấy bài cho mọi người.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResource<AnnouncementResource>> active(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(announcements.live(roleOf(me)).orElse(null), "OK");
    }

    /** Role lấy từ authority của phiên (JwtAuthFilter dựng từ Redis), không từ request. */
    private static RoleType roleOf(CustomUserDetails me) {
        if (me == null) {
            return null;
        }
        return me.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith(ROLE_PREFIX))
                .map(a -> RoleType.valueOf(a.substring(ROLE_PREFIX.length())))
                .findFirst()
                .orElse(null);
    }
}
