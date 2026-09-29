package com.techx.intervue.modules.review.resources;

public record ReviewResource(
        Long id,
        String targetType,
        Long targetId,
        String customerName,
        int rating,
        String comment,
        String createdAt,
        ReviewResponseResource response,
        String targetName) {}
