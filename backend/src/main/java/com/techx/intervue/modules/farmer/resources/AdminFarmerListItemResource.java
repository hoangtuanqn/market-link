package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.time.Instant;
import lombok.Builder;

@Builder
public record AdminFarmerListItemResource(
        Long id,
        String stallName,
        String contactPerson,
        String email,
        String phone,
        ApprovalStatus approvalStatus,
        Instant createdAt,
        String avatarUrl) {}
