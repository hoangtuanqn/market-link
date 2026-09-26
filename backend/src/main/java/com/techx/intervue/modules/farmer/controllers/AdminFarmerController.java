package com.techx.intervue.modules.farmer.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.requests.RejectFarmerRequest;
import com.techx.intervue.modules.farmer.requests.SuspendFarmerRequest;
import com.techx.intervue.modules.farmer.resources.AdminFarmerDetailResource;
import com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * §6, §7, §8 — Admin only. Reject/reinstate per docs/prototype/admin/farmers.html + farmer.html.
 */
@RestController
@RequestMapping("/api/v1/admin/farmers")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminFarmerController extends BaseController {

    private final FarmerServiceInterface farmerService;

    /**
     * {@code q}: search by stall name, contact person, email or phone (prototype admin/farmers).
     */
    @GetMapping
    public ResponseEntity<ApiResource<PageResource<AdminFarmerListItemResource>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        ApprovalStatus parsed = parseStatus(status);
        return ok(farmerService.listForAdmin(parsed, q, page, pageSize), "Farmers loaded.");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<AdminFarmerDetailResource>> detail(@PathVariable Long id) {
        return ok(farmerService.getDetailForAdmin(id), "Farmer loaded.");
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResource<AdminFarmerDetailResource>> approve(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(farmerService.approve(id, admin.getId()), "Farmer approved.");
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApiResource<AdminFarmerDetailResource>> reject(
            @PathVariable Long id,
            @Valid @RequestBody RejectFarmerRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(farmerService.reject(id, request, admin.getId()), "Farmer rejected.");
    }

    @PatchMapping("/{id}/suspend")
    public ResponseEntity<ApiResource<AdminFarmerDetailResource>> suspend(
            @PathVariable Long id,
            @Valid @RequestBody SuspendFarmerRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(farmerService.suspend(id, request, admin.getId()), "Farmer suspended.");
    }

    @PatchMapping("/{id}/reinstate")
    public ResponseEntity<ApiResource<AdminFarmerDetailResource>> reinstate(@PathVariable Long id) {
        return ok(farmerService.reinstate(id), "Farmer reinstated.");
    }

    private static ApprovalStatus parseStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return ApprovalStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new InvalidFieldException("status", "Unknown approval status.");
        }
    }
}
