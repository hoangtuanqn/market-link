package com.techx.intervue.modules.platform.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.platform.requests.PlatformStatusRequest;
import com.techx.intervue.modules.platform.resources.PlatformStatusResource;
import com.techx.intervue.modules.platform.services.interfaces.PlatformStatusServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/platform")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminPlatformController extends BaseController {

    private final PlatformStatusServiceInterface platformStatus;

    @PutMapping("/status")
    public ResponseEntity<ApiResource<PlatformStatusResource>> setStatus(
            @Valid @RequestBody PlatformStatusRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        PlatformStatusResource updated =
                platformStatus.setMaintenanceMode(request.maintenanceMode(), me.getId());
        String message =
                updated.maintenanceMode()
                        ? "Maintenance mode is on. Everyone but admins is now locked out."
                        : "Maintenance mode is off. MarketLink is open again.";
        return ok(updated, message);
    }
}
