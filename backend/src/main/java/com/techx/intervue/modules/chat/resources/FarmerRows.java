package com.techx.intervue.modules.chat.resources;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Rows the Farmer tools return (FR-093). Read-only projections, never entities. */
public final class FarmerRows {

    private FarmerRows() {}

    public record OrderRow(
            long orderId,
            String orderCode,
            String customerName,
            String marketName,
            LocalDate pickupDate,
            LocalTime pickupStart,
            LocalTime pickupEnd,
            LocalDateTime cutoffAt,
            BigDecimal total,
            String status,
            int itemCount) {}

    public record ProductStockRow(
            long productId,
            String name,
            BigDecimal price,
            String unit,
            int stockQuantity,
            int reserved,
            String status) {}

    public record SalesRow(long orderCount, BigDecimal revenue) {}

    public record BestSellerRow(
            String productName, String unit, long quantitySold, BigDecimal revenue) {}

    public record FarmerReviewRow(
            long reviewId,
            int rating,
            String comment,
            String customerName,
            String targetName,
            LocalDate createdOn,
            boolean answered) {}

    public record ScheduleDayRow(
            String marketName, int dayOfWeek, LocalTime pickupStart, LocalTime pickupEnd) {}
}
