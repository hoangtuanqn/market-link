package com.techx.intervue.modules.review.resources;

public record AdminReviewResource(
        Long id,
        String targetType,
        Long targetId,
        String targetName,
        String stallName,
        Long customerId,
        String customerName,
        int rating,
        String comment,
        String status,
        String createdAt,
        ReviewResponseResource response) {}
