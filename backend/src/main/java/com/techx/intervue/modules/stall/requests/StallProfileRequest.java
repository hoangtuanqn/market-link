package com.techx.intervue.modules.stall.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of PUT /api/v1/farmer/profile (contract §4). orderCutoffHours 1…72 is checked in the service
 * (D-05).
 */
public record StallProfileRequest(
        @NotBlank(message = "Stall name is required.") @Size(max = 120) String stallName,
        @NotBlank(message = "Contact person is required.") @Size(max = 100) String contactPerson,
        @Size(max = 2000) String description,
        @Size(max = 255) String logoUrl,
        @NotNull(message = "Order cutoff hours are required.") Integer orderCutoffHours) {}
