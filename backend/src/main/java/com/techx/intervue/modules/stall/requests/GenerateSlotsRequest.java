package com.techx.intervue.modules.stall.requests;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * POST /farmer/slots/generate — cuts the declared weekday time windows into slots (contract §6).
 */
public record GenerateSlotsRequest(
        @NotNull Long farmerMarketId,
        @NotNull LocalDate fromDate,
        @NotNull LocalDate toDate,
        @Min(15) @Max(240) int slotMinutes,
        @Min(1) @Max(100) int maxOrders) {}
