package com.techx.intervue.modules.product.requests;

/**
 * Query of GET /api/v1/deals (FR-125). Every filter is optional; {@code day} is the pickup weekday,
 * 0 = Sunday … 6 = Saturday, like GET /products.
 */
public record DealSearchCriteria(
        Long marketId, Long categoryId, Integer day, Long productId, int page, int pageSize) {}
