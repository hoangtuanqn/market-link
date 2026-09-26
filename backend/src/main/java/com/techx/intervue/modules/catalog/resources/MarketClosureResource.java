package com.techx.intervue.modules.catalog.resources;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Một ngày đóng cửa như trả về cho FE: {@code ordersAffected} đếm thật từ bảng orders (module
 * order), {@code announced} luôn false cho tới khi có tính năng thông báo khách hàng.
 */
public record MarketClosureResource(
        Long id,
        Long marketId,
        LocalDate closedOn,
        String reason,
        String handling,
        long ordersAffected,
        boolean announced,
        String createdByName,
        Instant createdAt) {}
