package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/**
 * {@code PATCH /admin/customers/{id}/status} — {@code "active"} or {@code "inactive"}. {@code
 * reason} and {@code until} only apply to {@code "inactive"} (required reason, optional expiry —
 * null means permanent); AdminCustomerService enforces this, not bean validation, since it is
 * conditional on {@code status}.
 */
public record CustomerStatusRequest(@NotBlank String status, String reason, Instant until) {}
