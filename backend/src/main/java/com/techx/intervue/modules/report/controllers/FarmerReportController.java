package com.techx.intervue.modules.report.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.resources.BestSellerResource;
import com.techx.intervue.modules.report.resources.FarmerDashboardResource;
import com.techx.intervue.modules.report.services.interfaces.FarmerReportServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-068/069 — {@code /farmer/dashboard}, {@code /farmer/reports/*} (plan C9, Task 9.1). */
@RestController
@RequestMapping("/api/v1/farmer")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerReportController extends BaseController {

    private final FarmerReportServiceInterface reports;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResource<FarmerDashboardResource>> dashboard(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(reports.dashboard(user.getId()), "Dashboard loaded.");
    }

    @GetMapping("/reports/best-sellers")
    public ResponseEntity<ApiResource<List<BestSellerResource>>> bestSellers(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(defaultValue = "5") int limit) {
        return ok(reports.bestSellers(user.getId(), from, to, limit), "Best sellers loaded.");
    }

    @GetMapping("/reports/sales")
    public ResponseEntity<ApiResource<PageResource<OrderListItemResource>>> sales(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ok(
                reports.salesHistory(user.getId(), from, to, page, pageSize),
                "Sales history loaded.");
    }
}
