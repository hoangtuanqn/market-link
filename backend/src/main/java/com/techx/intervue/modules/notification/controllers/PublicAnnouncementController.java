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

/** FR-077 — notice banner on the public pages (guests can read it too). */
@RestController
@RequestMapping("/api/v1/announcements")
@AllArgsConstructor
public class PublicAnnouncementController extends BaseController {

    private static final String ROLE_PREFIX = "ROLE_";

    private final AnnouncementServiceInterface announcements;

    /**
     * data is null when no announcement is currently in effect for the viewer. When an access token
     * is sent the banner is filtered by the session's role (a "Farmers only" post does not show for
     * a Customer); when it is not sent only posts for everyone are seen.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResource<AnnouncementResource>> active(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(announcements.live(roleOf(me)).orElse(null), "OK");
    }

    /**
     * The role comes from the session's authority (built by JwtAuthFilter from Redis), not from the
     * request.
     */
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
