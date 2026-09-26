package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.user.requests.UpdateSettingsRequest;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.resources.SettingsResource;
import com.techx.intervue.modules.user.services.interfaces.SettingsServiceInterface;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Settings for all three roles (theme, language, currency, date/time, units…). Not in
 * api-contract.md yet — proposed in docs/proposals/settings-api.md.
 */
@RestController
@RequestMapping("/api/v1/auth/me/settings")
@AllArgsConstructor
public class SettingsController extends BaseController {

    private final SettingsServiceInterface settingsService;

    @GetMapping
    public ResponseEntity<ApiResource<SettingsResource>> get(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(settingsService.get(user.getId()), "Settings loaded.");
    }

    @PutMapping
    public ResponseEntity<ApiResource<SettingsResource>> update(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody UpdateSettingsRequest request) {
        return ok(settingsService.update(user.getId(), request), "Settings saved.");
    }
}
