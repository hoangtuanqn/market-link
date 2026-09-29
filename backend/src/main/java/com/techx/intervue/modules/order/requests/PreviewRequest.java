package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public record PreviewRequest(
        @NotEmpty @Valid List<CartLine> items, List<@NotNull @Valid PickupDateInput> pickupDates) {

    public Map<Long, LocalDate> pickupDateByFarmer() {
        Map<Long, LocalDate> out = new HashMap<>();
        if (pickupDates != null) {
            pickupDates.forEach(p -> out.put(p.farmerId(), p.date()));
        }
        return out;
    }
}
