package com.techx.intervue.modules.product.requests;

import java.math.BigDecimal;

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
