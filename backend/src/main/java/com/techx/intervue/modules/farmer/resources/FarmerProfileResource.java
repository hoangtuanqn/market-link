package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

@Builder
public record FarmerProfileResource(
        Long id,
        String stallName,
        String contactPerson,
        String description,
        List<String> photoUrls,
        String videoUrl,
        ApprovalStatus approvalStatus,
        String rejectReason,
        String suspendReason,
        List<FarmerApplicationHistoryResource> history,
        Instant createdAt) {}
