package com.techx.intervue.modules.user.resources;

/**
 * {@code GET /admin/customers/{id}/status-history} row — {@code changedByName} null = the system.
 */
public record AdminCustomerStatusHistoryResource(
        Long id,
        String fromStatus,
        String toStatus,
        String reason,
        String until,
        String changedByName,
        String changedAt) {}
