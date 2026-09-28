package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.time.Instant;
import lombok.Builder;

/**
 * §6.1 — one row in the Admin's Farmer list. The parameter order is the order in the JPQL of {@code
 * FarmerProfileRepository#search}: change it here and it must be changed there too.
 */
@Builder
public record AdminFarmerListItemResource(
        Long id,
        String stallName,
        String contactPerson,
        String email,
        /**
         * docs/prototype/admin/farmers.html: the secondary line under the stall name is "contact
         * person · phone".
         */
        String phone,
        ApprovalStatus approvalStatus,
        Instant createdAt) {}
