package com.techx.intervue.modules.order.requests;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record PickupDateInput(@NotNull Long farmerId, @NotNull LocalDate date) {}
