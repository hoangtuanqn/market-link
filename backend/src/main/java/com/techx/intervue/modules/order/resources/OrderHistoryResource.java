package com.techx.intervue.modules.order.resources;

/**
 * Một dòng {@code order_status_history} (FR-038). {@code fromStatus} là {@code null} ở dòng đầu
 * tiên (lúc đặt). {@code changedByRole} là {@code customer|farmer|admin}, {@code null} khi hệ thống
 * tự đổi (không có {@code changed_by}).
 */
public record OrderHistoryResource(
        String fromStatus,
        String toStatus,
        String changedAt,
        String note,
        String changedByName,
        String changedByRole) {}
