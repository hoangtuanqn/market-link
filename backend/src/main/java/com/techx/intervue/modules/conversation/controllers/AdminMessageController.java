package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.resources.ModeratedMessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ModerationServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-116 — Admin only. Soft hide, never a hard delete (spec §8.5): being able to delete means being
 * able to delete evidence of fraud. There is no un-hide endpoint — nobody needs it yet, and adding
 * it adds a state that has to be checked everywhere.
 */
@RestController
@RequestMapping("/api/v1/admin/messages")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminMessageController extends BaseController {

    private final ModerationServiceInterface moderation;

    @PatchMapping("/{id}/hide")
    public ResponseEntity<ApiResource<ModeratedMessageResource>> hide(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(moderation.hide(admin.getId(), id), "Message hidden.");
    }
}
