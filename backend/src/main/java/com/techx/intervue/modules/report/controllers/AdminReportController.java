package com.techx.intervue.modules.report.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.resources.AdminDashboardResource;
import com.techx.intervue.modules.report.resources.RevenueByMarketResource;
import com.techx.intervue.modules.report.resources.TopFarmerResource;
import com.techx.intervue.modules.report.resources.TopProductResource;
import com.techx.intervue.modules.report.services.interfaces.AdminReportServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminReportController extends BaseController {

    private final AdminReportServiceInterface reports;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResource<AdminDashboardResource>> dashboard() {
        return ok(reports.dashboard(), "Dashboard loaded.");
    }

    @GetMapping("/reports/orders")
    public ResponseEntity<ApiResource<PageResource<OrderListItemResource>>> orders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(required = false) Long marketId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(
                reports.orders(from, to, marketId, status, customerId, page, pageSize),
                "Orders loaded.");
    }

    @GetMapping("/reports/revenue")
    public ResponseEntity<ApiResource<List<RevenueByMarketResource>>> revenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to) {
        return ok(reports.revenueByMarket(from, to), "Revenue by market loaded.");
    }

    @GetMapping("/reports/top-farmers")
    public ResponseEntity<ApiResource<List<TopFarmerResource>>> topFarmers(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(defaultValue = "10") int limit) {
        return ok(reports.topFarmers(from, to, limit), "Top farmers loaded.");
    }

    @GetMapping("/reports/top-products")
    public ResponseEntity<ApiResource<List<TopProductResource>>> topProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(defaultValue = "10") int limit) {
        return ok(reports.topProducts(from, to, limit), "Top products loaded.");
    }
}
