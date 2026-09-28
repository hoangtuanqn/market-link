package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/**
 * {@code PATCH /admin/customers/{id}/status} — {@code "active"} or {@code "inactive"}. {@code
 * reason} and {@code until} only apply to {@code "inactive"} (required reason, optional expiry —
 * null means permanent); AdminCustomerService enforces "required", not bean validation, since it is
 * conditional on {@code status} — but the length cap applies unconditionally, matching {@code
 * users.deactivation_reason VARCHAR(255)}.
 */
public record CustomerStatusRequest(
        @NotBlank String status,
        @Size(max = 255, message = "Keep the reason under 255 characters.") String reason,
        Instant until) {}
