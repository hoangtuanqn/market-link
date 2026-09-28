package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.quality.requests.FarmerResponseRequest;
import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.services.interfaces.FarmerQualityReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-122 — the stall's spoilage reports (spec §4.4.2, §6). */
@RestController
@RequestMapping("/api/v1/farmer/quality-reports")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerQualityReportController extends BaseController {

    private final FarmerQualityReportServiceInterface reports;

    @GetMapping
    public ResponseEntity<ApiResource<FarmerQualityReportsResource>> mine(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(reports.list(user.getId(), page, pageSize), "Reports loaded.");
    }

    @PutMapping("/{id}/response")
    public ResponseEntity<ApiResource<QualityReportResource>> respond(
            @PathVariable long id,
            @Valid @RequestBody FarmerResponseRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(reports.respond(user.getId(), id, request.response()), "Reply saved.");
    }
}
