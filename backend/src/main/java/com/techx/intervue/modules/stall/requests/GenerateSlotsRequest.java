package com.techx.intervue.modules.stall.requests;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record GenerateSlotsRequest(
        @NotNull Long farmerMarketId,
        @NotNull LocalDate fromDate,
        @NotNull LocalDate toDate,
        @Min(15) @Max(240) int slotMinutes,
        @Min(1) @Max(100) int maxOrders) {}
