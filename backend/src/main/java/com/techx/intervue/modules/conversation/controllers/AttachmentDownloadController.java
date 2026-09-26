package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import java.time.Duration;
import lombok.AllArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-115, spec §8.2. Returns a binary file so it is NOT wrapped in ApiResource — a deliberate
 * exception to the envelope convention, like every file-download endpoint. On errors
 * ConversationExceptionHandler still returns the normal envelope.
 *
 * <p>Cache-Control private: private images, a shared proxy must not keep them.
 */
@RestController
@RequestMapping("/api/v1/attachments")
@AllArgsConstructor
public class AttachmentDownloadController {

    private final AttachmentServiceInterface attachmentService;

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        // Admins take a separate path (spec §8.3): narrower, only open for messages that were
        // reported, and logged.
        AttachmentServiceInterface.StoredFile file =
                isAdmin(me)
                        ? attachmentService.readAsAdmin(me.getId(), id)
                        : attachmentService.read(me.getId(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.mime()))
                .contentLength(file.sizeBytes())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
                .header("Content-Disposition", "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.body());
    }

    /**
     * A deliberate consequence: an admin who is ALSO a customer in some thread takes the admin
     * branch and cannot view their own private image there if the message has not been reported. A
     * trade-off in the right direction — the admin's boundary is narrower, never wider.
     */
    private static boolean isAdmin(CustomUserDetails me) {
        return me.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
