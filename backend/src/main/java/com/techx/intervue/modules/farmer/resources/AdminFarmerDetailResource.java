package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.user.enums.UserStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

@Builder
public record AdminFarmerDetailResource(
        Long id,
        Long userId,
        String stallName,
        String contactPerson,
        String description,
        List<String> photoUrls,
        String videoUrl,
        String email,
        String phone,
        String address,
        ApprovalStatus approvalStatus,
        String rejectReason,
        String suspendReason,
        Instant approvedAt,
        Instant suspendedAt,
        Instant createdAt,
        List<FarmerApplicationHistoryResource> history,
        Instant customerSince,
        UserStatus accountStatus,
        int activeViolations,
        Instant extensionLockedUntil) {}
