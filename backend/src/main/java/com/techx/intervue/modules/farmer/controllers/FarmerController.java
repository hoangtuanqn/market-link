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
 * FR-002 (second route — customer đang đăng nhập xin thành Farmer; xem caption ở
 * CustomerBecomeFarmer/index.tsx). Không phải luồng đăng ký Guest ở /auth/register/farmer.
 */
@RestController
@RequestMapping("/api/v1/farmer")
@AllArgsConstructor
public class FarmerController extends BaseController {

    private final FarmerServiceInterface farmerService;

    /** Chỉ Customer nộp đơn được; đã là Farmer/Admin thì 403 (role lấy từ token, R-06). */
    @PostMapping("/apply")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResource<FarmerProfileResource>> apply(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody FarmerApplicationRequest request) {
        return created(farmerService.apply(user.getId(), request), "Application sent.");
    }

    /**
     * Trạng thái đơn của chính mình; null nếu chưa từng nộp — FE coi là "empty", không phải lỗi.
     * Customer (chờ duyệt / bị từ chối) và Farmer (đã duyệt / bị đình chỉ) đều cần đọc; Admin xem
     * qua /admin/farmers nên không mở ở đây.
     */
    @GetMapping("/apply")
    @PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
    public ResponseEntity<ApiResource<FarmerProfileResource>> myApplication(
            @AuthenticationPrincipal CustomUserDetails user) {
        FarmerProfileResource profile = farmerService.getMyProfile(user.getId());
        String message = profile == null ? "No application yet." : "Application loaded.";
        return ok(profile, message);
    }

    /** Rút đơn khi còn đang chờ duyệt — sau đó tài khoản nộp lại từ đầu được. */
    @DeleteMapping("/apply")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResource<Void>> withdraw(
            @AuthenticationPrincipal CustomUserDetails user) {
        farmerService.withdraw(user.getId());
        return ok(null, "Application withdrawn.");
    }
}
