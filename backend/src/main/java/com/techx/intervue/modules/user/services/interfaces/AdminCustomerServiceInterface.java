package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource;
import com.techx.intervue.resources.PageResource;
import java.time.Instant;

/** FR-072 — view, activate or deactivate customer accounts (contract §10). */
public interface AdminCustomerServiceInterface {

    /** {@code status} null = any; {@code query} matches name, email or phone. */
    PageResource<AdminCustomerResource> list(String status, String query, int page, int pageSize);

    /**
     * {@code "active"} | {@code "inactive"}; other values and non-customer accounts are a 400.
     * {@code reason} is required and {@code until} (nullable = permanent) must be in the future
     * when {@code status="inactive"}; both are ignored when reactivating. {@code actorId} is the
     * admin doing this, or {@code null} when the system (auto-reactivate) does it.
     */
    AdminCustomerResource setStatus(
            long userId, String status, String reason, Instant until, Long actorId);

    /** {@code GET /admin/customers/{id}} — 404 when the id is not a customer account. */
    AdminCustomerResource detail(long userId);

    /**
     * {@code GET /admin/customers/{id}/status-history} — 404 when the id is not a customer account.
     */
    PageResource<AdminCustomerStatusHistoryResource> statusHistory(
            long userId, int page, int pageSize);
}
