package com.techx.intervue.modules.order.resources;

public record OrderHistoryResource(
        String fromStatus,
        String toStatus,
        String changedAt,
        String note,
        String changedByName,
        String changedByRole) {}
