package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** One stall's pickup day in POST /orders/preview (FR-125): price that stall's lines for it. */
public record PickupDateInput(@NotNull Long farmerId, @NotNull LocalDate date) {}
