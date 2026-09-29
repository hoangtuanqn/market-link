package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

@Builder
public record FarmerApplicationHistoryResource(
        Long id,
        Integer attempt,
        String stallName,
        String contactPerson,
        String description,
        List<String> photoUrls,
        String videoUrl,
        ApprovalStatus status,
        String rejectReason,
        Instant decidedAt,
        Instant submittedAt) {}
