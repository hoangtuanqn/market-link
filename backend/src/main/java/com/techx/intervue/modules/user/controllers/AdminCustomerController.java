package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.user.requests.CustomerStatusRequest;
import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-072 — {@code GET /admin/customers}, {@code PATCH /admin/customers/{id}/status} (contract §10).
 */
@RestController
@RequestMapping("/api/v1/admin/customers")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminCustomerController extends BaseController {

    private final AdminCustomerServiceInterface customers;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<AdminCustomerResource>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(customers.list(status, q, page, pageSize), "Customers loaded.");
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResource<AdminCustomerResource>> setStatus(
            @PathVariable long id, @Valid @RequestBody CustomerStatusRequest request) {
        AdminCustomerResource updated = customers.setStatus(id, request.status());
        return ok(
                updated,
                "inactive".equals(updated.status())
                        ? "Account deactivated. They can no longer sign in."
                        : "Account active again.");
    }
}
