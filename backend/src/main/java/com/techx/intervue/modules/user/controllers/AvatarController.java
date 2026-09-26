package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.interfaces.AvatarServiceInterface;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Your own avatar: the id comes from the access token, another person's avatar cannot be changed
 * (R-06). Not in api-contract.md yet — proposed in docs/proposals/avatar-api.md.
 */
@RestController
@RequestMapping("/api/v1/auth/me/avatar")
@AllArgsConstructor
public class AvatarController extends BaseController {

    private final AvatarServiceInterface avatarService;

    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResource<UserResource>> upload(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestPart("file") MultipartFile file) {
        return ok(avatarService.setAvatar(user.getId(), file), "Your photo is saved.");
    }

    @DeleteMapping
    public ResponseEntity<ApiResource<UserResource>> remove(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(avatarService.removeAvatar(user.getId()), "Your photo is removed.");
    }
}
