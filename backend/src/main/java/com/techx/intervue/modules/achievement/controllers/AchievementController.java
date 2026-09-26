package com.techx.intervue.modules.achievement.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.achievement.resources.AchievementResource;
import com.techx.intervue.modules.achievement.services.interfaces.AchievementServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Personal achievements of the signed-in user. Not in api-contract.md yet — a proposal; the id
 * comes from the access token, so users can only view their own (R-06).
 */
@RestController
@RequestMapping("/api/v1/auth/me/achievements")
@AllArgsConstructor
public class AchievementController extends BaseController {

    private final AchievementServiceInterface achievementService;

    @GetMapping
    public ResponseEntity<ApiResource<AchievementResource>> get(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(achievementService.forUser(user.getId()), "Achievements loaded.");
    }
}
