package com.techx.intervue.modules.stall.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;

public record OperatingDaysRequest(@NotNull @Valid List<Day> days) {

    public record Day(
            @Min(0) @Max(6) int dayOfWeek,
            @NotBlank @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "Use HH:mm.")
                    String pickupStartTime,
            @NotBlank @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "Use HH:mm.")
                    String pickupEndTime) {}
}
