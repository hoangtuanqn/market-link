package com.techx.intervue.modules.catalog.resources;

import java.time.Instant;
import java.time.LocalDate;

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
