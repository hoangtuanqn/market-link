package com.techx.intervue.modules.review.resources;

/**
 * One review as {@code GET /admin/reviews} returns it (contract §8, moderation queue). Unlike
 * {@link ReviewResource}, this carries the raw {@code status} (visible/hidden), the reviewer's id
 * (so the admin can filter by customer) and {@code stallName} — the stall that owns what was
 * reviewed, which is the target itself for a stall review but the product's own stall for a product
 * review.
 */
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
