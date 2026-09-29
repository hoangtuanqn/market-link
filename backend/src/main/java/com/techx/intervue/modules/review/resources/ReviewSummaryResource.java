package com.techx.intervue.modules.review.resources;

import java.math.BigDecimal;
import java.util.List;

public record ReviewSummaryResource(
        BigDecimal ratingAvg, int ratingCount, List<Integer> histogram) {

    public static ReviewSummaryResource empty() {
        return new ReviewSummaryResource(BigDecimal.ZERO, 0, List.of(0, 0, 0, 0, 0));
    }
}
