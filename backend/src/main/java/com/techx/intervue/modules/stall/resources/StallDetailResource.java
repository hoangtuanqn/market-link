package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * GET /farmers/{id} và GET /farmer/profile (contract §4). `approvalStatus` chỉ có ý nghĩa cho chính
 * Farmer — trang public chỉ thấy stall đã duyệt (D-09).
 */
public record StallDetailResource(
        Long farmerId,
        String stallName,
        String contactPerson,
        String description,
        String logoUrl,
        int orderCutoffHours,
        BigDecimal ratingAvg,
        int ratingCount,
        String approvalStatus,
        List<StallMarketResource> markets) {}
