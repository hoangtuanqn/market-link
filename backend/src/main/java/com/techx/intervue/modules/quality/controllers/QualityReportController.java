package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;
import com.techx.intervue.modules.quality.services.interfaces.CustomerQualityReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-122 — {@code POST /orders/{orderId}/items/{itemId}/quality-report} (spec §6). {@code itemId}
 * is order_items.id, which GET /orders/{id} returns on every line as {@code itemId}.
 */
@RestController
@RequestMapping("/api/v1/orders/{orderId}/items/{itemId}/quality-report")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class QualityReportController extends BaseController {

    private final CustomerQualityReportServiceInterface reports;

    @PostMapping
    public ResponseEntity<ApiResource<ItemQualityReportResource>> report(
            @PathVariable long orderId,
            @PathVariable long itemId,
            @Valid @RequestBody CreateQualityReportRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return created(
                reports.report(user.getId(), orderId, itemId, request),
                "Report sent. The stall can reply, and an admin may review it.");
    }
}
