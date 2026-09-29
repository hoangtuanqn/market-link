package com.techx.intervue.modules.stall.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StallProfileRequest(
        @NotBlank(message = "Stall name is required.") @Size(max = 120) String stallName,
        @NotBlank(message = "Contact person is required.") @Size(max = 100) String contactPerson,
        @Size(max = 2000) String description,
        @Size(max = 255) String logoUrl,
        @NotNull(message = "Order cutoff hours are required.") Integer orderCutoffHours) {}
