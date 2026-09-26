package com.techx.intervue.modules.review.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * Review summary of a product or stall (contract §5 `reviewsSummary`, §8). `histogram` has 5
 * elements: the number of reviews from 1 to 5 stars. Cluster C3 only declares the shape with 0
 * values; the review module (C8) will fill in the data.
 */
public record ReviewSummaryResource(
        BigDecimal ratingAvg, int ratingCount, List<Integer> histogram) {

    public static ReviewSummaryResource empty() {
        return new ReviewSummaryResource(BigDecimal.ZERO, 0, List.of(0, 0, 0, 0, 0));
    }
}
