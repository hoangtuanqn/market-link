package com.techx.intervue.modules.product.requests;

public record DealSearchCriteria(
        Long marketId, Long categoryId, Integer day, Long productId, int page, int pageSize) {}
