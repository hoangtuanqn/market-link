package com.techx.intervue.modules.farmer.resources;

/**
 * {@code GET /admin/farmers/{id}/status-history} row — {@code changedByName} null = the system (the
 * auto-reinstate cron).
 */
public record AdminFarmerStatusHistoryResource(
        Long id,
        String fromStatus,
        String toStatus,
        String reason,
        String until,
        String changedByName,
        String changedAt) {}
