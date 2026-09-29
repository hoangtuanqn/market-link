package com.techx.intervue.modules.user.resources;

public record AdminCustomerResource(
        Long userId,
        String fullName,
        String email,
        String phone,
        String status,
        long orderCount,
        String createdAt,
        String avatarUrl) {}
