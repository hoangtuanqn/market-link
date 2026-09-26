package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/** One order in the place-order call: one stall, one market, one slot (D-01). */
public record OrderGroupInput(
        @NotNull Long farmerId,
        @NotNull Long marketId,
        Long slotId,
        @NotNull LocalDate pickupDate,
        @NotEmpty @Valid List<CartLine> items,
        @Size(max = 255) String customerNote) {}
