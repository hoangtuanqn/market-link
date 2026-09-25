package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.time.Instant;
import lombok.Builder;

/** §6.1 — một dòng trong danh sách Farmer của Admin. */
@Builder
public record AdminFarmerListItemResource(
        Long id,
        String stallName,
        String contactPerson,
        String email,
        ApprovalStatus approvalStatus,
        Instant createdAt) {}
