package com.techx.intervue.modules.notification.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.notification.requests.AnnouncementRequest;
import com.techx.intervue.modules.notification.resources.AnnouncementResource;
import com.techx.intervue.modules.notification.services.interfaces.AnnouncementServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-077 — chỉ Admin. POST tạo và gửi ngay; DELETE chỉ gỡ banner. */
@Validated
@RestController
@RequestMapping("/api/v1/admin/announcements")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminAnnouncementController extends BaseController {

    private final AnnouncementServiceInterface announcements;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<AnnouncementResource>>> list(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ok(announcements.list(page, size), "OK");
    }

    @PostMapping
    public ResponseEntity<ApiResource<AnnouncementResource>> create(
            @Valid @RequestBody AnnouncementRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return created(announcements.create(me.getId(), request), "Announcement published.");
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResource<AnnouncementResource>> update(
            @PathVariable Long id, @Valid @RequestBody AnnouncementRequest request) {
        return ok(announcements.update(id, request), "Announcement updated.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResource<Void>> takeDown(@PathVariable Long id) {
        announcements.deactivate(id);
        return ok(null, "Announcement taken down.");
    }
}
