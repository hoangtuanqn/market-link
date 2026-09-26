package com.techx.intervue.modules.order.resources;

/**
 * One {@code order_status_history} row (FR-038). {@code fromStatus} is {@code null} on the first
 * row (at placement). {@code changedByRole} is {@code customer|farmer|admin}, {@code null} when the
 * system made the change (no {@code changed_by}).
 */
public record OrderHistoryResource(
        String fromStatus,
        String toStatus,
        String changedAt,
        String note,
        String changedByName,
        String changedByRole) {}
