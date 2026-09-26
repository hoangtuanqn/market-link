package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

/**
 * The caller's own Farmer profile (a Customer awaiting approval, or an approved/suspended Farmer).
 */
@Builder
public record FarmerProfileResource(
        Long id,
        String stallName,
        String contactPerson,
        String description,
        List<String> photoUrls,
        String videoUrl,
        ApprovalStatus approvalStatus,
        /**
         * Only meaningful when rejected — the applicant must be able to read why in order to know
         * what to fix.
         */
        String rejectReason,
        /**
         * Only meaningful when suspended (D-09) — the Farmer must know why their goods are hidden.
         */
        String suspendReason,
        /** Earlier applications, newest first. */
        List<FarmerApplicationHistoryResource> history,
        Instant createdAt) {}
