package com.techx.intervue.modules.catalog.resources;

import java.time.Instant;
import java.time.LocalDate;

/**
 * One closed day as returned to the FE: {@code ordersAffected} is a real count from the orders
 * table (order module), {@code announced} is always false until a customer-notification feature
 * exists.
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
