package com.techx.intervue.modules.user.resources;

/** {@code GET /admin/customers} row (FR-072, contract §10). {@code status}: active | inactive. */
public record AdminCustomerResource(
        Long userId,
        String fullName,
        String email,
        String phone,
        String status,
        long orderCount,
        String createdAt) {}
