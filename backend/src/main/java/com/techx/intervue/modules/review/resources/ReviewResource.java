package com.techx.intervue.modules.review.resources;

/**
 * One review as the public lists and {@code POST /reviews} return it (contract §8). {@code
 * targetId} is the product id or the farmer_profiles id according to {@code targetType}; {@code
 * response} is null until the stall answers. {@code targetName} is the product name or the stall
 * name, so a list does not need a second lookup to show what was reviewed.
 */
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
