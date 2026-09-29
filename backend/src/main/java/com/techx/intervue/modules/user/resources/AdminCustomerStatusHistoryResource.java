package com.techx.intervue.modules.user.resources;

public record AdminCustomerStatusHistoryResource(
        Long id,
        String fromStatus,
        String toStatus,
        String reason,
        String until,
        String changedByName,
        String changedAt) {}
