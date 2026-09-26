package com.techx.intervue.modules.notification.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.notification.resources.AnnouncementResource;
import com.techx.intervue.modules.notification.services.interfaces.AnnouncementServiceInterface;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-077 — banner thông báo ở trang public (khách vãng lai cũng đọc được). */
@RestController
@RequestMapping("/api/v1/announcements")
@AllArgsConstructor
public class PublicAnnouncementController extends BaseController {

    private final AnnouncementServiceInterface announcements;

    /** data null khi không có thông báo nào đang hiệu lực. */
    @GetMapping("/active")
    public ResponseEntity<ApiResource<AnnouncementResource>> active() {
        return ok(announcements.live().orElse(null), "OK");
    }
}
