package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.exceptions.StreamLinkInvalidException;
import com.techx.intervue.modules.conversation.resources.StreamUrlResource;
import com.techx.intervue.modules.conversation.services.impl.MediaProbe;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import java.time.Duration;
import lombok.AllArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-115, spec §8.2. Returns a binary file so it is NOT wrapped in ApiResource — a deliberate
 * exception to the envelope convention, like every file-download endpoint. On errors
 * ConversationExceptionHandler still returns the normal envelope.
 *
 * <p>Cache-Control private: private images, a shared proxy must not keep them.
 *
 * <p>FR-115 §5: videos play through a short-lived signed link (stream-url → stream) because a video
 * element cannot send the Authorization header. /stream is the only public route here; the link's
 * signature stands in for the token.
 */
@RestController
@RequestMapping("/api/v1/attachments")
@AllArgsConstructor
public class AttachmentDownloadController extends BaseController {

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

    @GetMapping("/{id}/stream-url")
    public ResponseEntity<ApiResource<StreamUrlResource>> streamUrl(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        return ok(attachmentService.streamUrl(me.getId(), isAdmin(me), id), "OK");
    }

    /**
     * Public (SecurityConfig): the signed parameters are the credentials. Every part is read as
     * text and a missing or mangled one is the same 403 as a forged signature, never a 400. Spring
     * answers a Range request for a Resource body with 206 by itself, which is what lets the player
     * seek without downloading the whole file.
     */
    @GetMapping("/{id}/stream")
    public ResponseEntity<Resource> stream(
            @PathVariable Long id,
            @RequestParam(name = "u", required = false) String user,
            @RequestParam(name = "s", required = false) String scope,
            @RequestParam(name = "e", required = false) String exp,
            @RequestParam(name = "t", required = false) String signature,
            @RequestParam(name = "download", required = false) String download) {
        if (scope == null || scope.length() != 1 || signature == null) {
            throw new StreamLinkInvalidException();
        }
        AttachmentServiceInterface.StoredFile file =
                attachmentService.stream(id, number(user), scope.charAt(0), number(exp), signature);
        ContentDisposition disposition =
                "1".equals(download)
                        ? ContentDisposition.attachment()
                                .filename("marketlink-" + id + MediaProbe.extension(file.mime()))
                                .build()
                        : ContentDisposition.inline().build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.mime()))
                .cacheControl(CacheControl.empty().cachePrivate())
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(file.body());
    }

    private static long number(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            throw new StreamLinkInvalidException();
        }
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
