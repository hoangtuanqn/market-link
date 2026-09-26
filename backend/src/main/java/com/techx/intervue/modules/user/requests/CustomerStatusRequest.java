package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;

/** {@code PATCH /admin/customers/{id}/status} — {@code "active"} or {@code "inactive"}. */
public record CustomerStatusRequest(@NotBlank String status) {}
