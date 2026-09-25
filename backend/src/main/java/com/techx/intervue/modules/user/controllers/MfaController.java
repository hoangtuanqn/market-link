package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.user.requests.MfaCodeRequest;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.resources.MfaRecoveryCodesResource;
import com.techx.intervue.modules.user.resources.MfaSetupResource;
import com.techx.intervue.modules.user.resources.MfaStatusResource;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-008: admin bật / tắt xác thực hai bước cho chính mình. Bước 2 lúc đăng nhập nằm ở
 * AuthController (POST /auth/mfa/verify) vì cần set cookie như đăng nhập thường.
 */
@RestController
@RequestMapping("/api/v1/auth/mfa")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class MfaController extends BaseController {

    private final MfaServiceInterface mfaService;

    @GetMapping
    public ResponseEntity<ApiResource<MfaStatusResource>> status(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(mfaService.status(user.getId()), "Two-step verification status.");
    }

    @PostMapping("/setup")
    public ResponseEntity<ApiResource<MfaSetupResource>> setup(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(
                mfaService.setup(user.getId(), user.getUsername()),
                "Scan the code with your authenticator.");
    }

    @PostMapping("/enable")
    public ResponseEntity<ApiResource<MfaRecoveryCodesResource>> enable(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody MfaCodeRequest request) {
        return ok(
                new MfaRecoveryCodesResource(mfaService.enable(user.getId(), request.code())),
                "Two-step verification is on.");
    }

    /** Mã cũ hết hiệu lực ngay; mã mới chỉ trả về một lần. */
    @PostMapping("/recovery-codes")
    public ResponseEntity<ApiResource<MfaRecoveryCodesResource>> regenerateRecoveryCodes(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody MfaCodeRequest request) {
        return ok(
                new MfaRecoveryCodesResource(
                        mfaService.regenerateRecoveryCodes(user.getId(), request.code())),
                "Ten new recovery codes. The old ones no longer work.");
    }

    @PostMapping("/disable")
    public ResponseEntity<ApiResource<Void>> disable(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody MfaCodeRequest request) {
        mfaService.disable(user.getId(), request.code());
        return ok(null, "Two-step verification is off.");
    }
}
