package com.techx.intervue.modules.review.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * Tóm tắt đánh giá của một sản phẩm hoặc stall (contract §5 `reviewsSummary`, §8). `histogram` có 5
 * phần tử: số review từ 1 tới 5 sao. Cụm C3 chỉ khai hình dạng với số 0; module review (C8) mới đổ
 * dữ liệu.
 */
public record ReviewSummaryResource(
        BigDecimal ratingAvg, int ratingCount, List<Integer> histogram) {

    public static ReviewSummaryResource empty() {
        return new ReviewSummaryResource(BigDecimal.ZERO, 0, List.of(0, 0, 0, 0, 0));
    }
}
