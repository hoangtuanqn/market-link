package com.techx.intervue.modules.farmer.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.farmer.requests.FarmerApplicationRequest;
import com.techx.intervue.modules.farmer.resources.FarmerProfileResource;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-002 (second route — a signed-in customer applies to become a Farmer; see the caption in
 * CustomerBecomeFarmer/index.tsx). This is not the Guest sign-up flow at /auth/register/farmer.
 */
@RestController
@RequestMapping("/api/v1/farmer")
@AllArgsConstructor
public class FarmerController extends BaseController {

    private final FarmerServiceInterface farmerService;

    /**
     * Only a Customer can apply; someone who is already Farmer/Admin gets 403 (role comes from the
     * token, R-06).
     */
    @PostMapping("/apply")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResource<FarmerProfileResource>> apply(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody FarmerApplicationRequest request) {
        return created(farmerService.apply(user.getId(), request), "Application sent.");
    }

    /**
     * The status of your own application; null if you never applied — the FE treats it as "empty",
     * not an error. Both a Customer (pending / rejected) and a Farmer (approved / suspended) need
     * to read it; Admin views through /admin/farmers so it is not opened here.
     */
    @GetMapping("/apply")
    @PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
    public ResponseEntity<ApiResource<FarmerProfileResource>> myApplication(
            @AuthenticationPrincipal CustomUserDetails user) {
        FarmerProfileResource profile = farmerService.getMyProfile(user.getId());
        String message = profile == null ? "No application yet." : "Application loaded.";
        return ok(profile, message);
    }

    /**
     * Withdraw the application while it is still pending — after that the account can apply again
     * from scratch.
     */
    @DeleteMapping("/apply")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResource<Void>> withdraw(
            @AuthenticationPrincipal CustomUserDetails user) {
        farmerService.withdraw(user.getId());
        return ok(null, "Application withdrawn.");
    }
}
