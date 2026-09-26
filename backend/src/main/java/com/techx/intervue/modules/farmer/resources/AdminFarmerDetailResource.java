package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.user.enums.UserStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

/** §6.2 — full detail so the Admin can approve or suspend. */
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
        /** Every time this account applied, newest first. */
        List<FarmerApplicationHistoryResource> history,
        /**
         * The Customer account already existed — this is not the creation date of this Farmer
         * profile.
         */
        Instant customerSince,
        UserStatus accountStatus) {}
