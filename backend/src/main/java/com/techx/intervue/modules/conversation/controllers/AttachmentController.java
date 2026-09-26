package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * FR-115. The image is uploaded first and attached to a message later — the client needs the size
 * to reserve space in the chat frame before the image finishes loading. GET lives in
 * AttachmentDownloadController (a different return type).
 */
@RestController
@RequestMapping("/api/v1/attachments")
@AllArgsConstructor
public class AttachmentController extends BaseController {

    private final AttachmentServiceInterface attachmentService;

    @PostMapping
    public ResponseEntity<ApiResource<AttachmentResource>> upload(
            @RequestParam MultipartFile file, @AuthenticationPrincipal CustomUserDetails me) {
        return created(attachmentService.upload(me.getId(), file), "Photo uploaded.");
    }
}
