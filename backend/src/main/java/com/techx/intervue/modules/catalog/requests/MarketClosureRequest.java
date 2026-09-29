package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record MarketClosureRequest(
        @NotNull(message = "Date is required.") LocalDate closedOn,
        @Size(max = 255) String reason,
        @NotBlank(message = "Handling is required.") String handling) {}
