package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * Một stall trong danh sách của chợ hoặc kết quả tìm Farmer (contract §4). Cụm C1 chỉ khai hình
 * dạng; module stall (C2) mới đổ dữ liệu.
 */
public record StallSummaryResource(
        Long farmerId,
        String stallName,
        String logoUrl,
        String stallCode,
        BigDecimal stallLatitude,
        BigDecimal stallLongitude,
        BigDecimal ratingAvg,
        int ratingCount,
        List<Integer> operatingDays) {}
