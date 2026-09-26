package com.techx.intervue.modules.chat.resources;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

/** The data rows that ChatKnowledgeRepository reads out. */
public final class KnowledgeRows {

    private KnowledgeRows() {}

    public record ProductRow(
            Long productId,
            String name,
            BigDecimal price,
            String unit,
            int stockQuantity,
            String status,
            Long farmerId,
            String stallName,
            List<String> marketNames) {}

    public record MarketRow(
            Long marketId,
            String marketName,
            String address,
            LocalTime openingTime,
            LocalTime closingTime,
            List<Integer> operatingDays) {}

    public record FarmerRow(Long farmerId, String stallName) {}

    public record ScheduleRow(
            Long farmerId,
            String stallName,
            Long marketId,
            String marketName,
            int dayOfWeek,
            LocalTime pickupStart,
            LocalTime pickupEnd) {}
}
