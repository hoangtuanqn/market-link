package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.quality.requests.DecisionRequest;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.services.interfaces.AdminQualityReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
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

/** FR-123 — the admin's spoilage queue and decisions (spec §4.4.3, §6). Admin only. */
@RestController
@RequestMapping("/api/v1/admin/quality-reports")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminQualityReportController extends BaseController {

    private final AdminQualityReportServiceInterface reports;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<QualityReportResource>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean escalated,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(reports.list(status, escalated, page, pageSize), "Reports loaded.");
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<ApiResource<QualityReportResource>> confirm(
            @PathVariable long id,
            @Valid @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(
                reports.confirm(admin.getId(), id, request == null ? null : request.note()),
                "Violation confirmed.");
    }

    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<ApiResource<QualityReportResource>> dismiss(
            @PathVariable long id,
            @Valid @RequestBody DecisionRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(reports.dismiss(admin.getId(), id, request.note()), "Report dismissed.");
    }
}
