package com.techx.intervue.modules.farmer.resources;

public record AdminFarmerStatusHistoryResource(
        Long id,
        String fromStatus,
        String toStatus,
        String reason,
        String until,
        String changedByName,
        String changedAt) {}
