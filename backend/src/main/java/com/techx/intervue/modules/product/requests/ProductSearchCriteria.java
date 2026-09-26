package com.techx.intervue.modules.product.requests;

import java.math.BigDecimal;

/**
 * Query của GET /api/v1/products (contract §5). `sort`: price_asc | price_desc | newest | rating.
 */
public record ProductSearchCriteria(
        String q,
        Long categoryId,
        Long marketId,
        Long farmerId,
        Integer day,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String sort,
        int page,
        int pageSize) {

    public ProductSearchCriteria withPrices(BigDecimal min, BigDecimal max) {
        return new ProductSearchCriteria(
                q, categoryId, marketId, farmerId, day, min, max, sort, page, pageSize);
    }
}
