package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * POST /orders/preview — the cart the client sends up, for the server to split by stall (D-01).
 * {@code pickupDates} is optional (FR-125, spec §4.5.5): a stall listed there is priced for that
 * day — price, stock, deal and best-before of exactly that day — the others for their nearest
 * orderable day, as before. A null entry in it is a 400, like a missing field of one entry.
 */
public record PreviewRequest(
        @NotEmpty @Valid List<CartLine> items, List<@NotNull @Valid PickupDateInput> pickupDates) {

    /** Stall id → the day to price it for; a stall listed twice keeps its last entry. */
    public Map<Long, LocalDate> pickupDateByFarmer() {
        Map<Long, LocalDate> out = new HashMap<>();
        if (pickupDates != null) {
            pickupDates.forEach(p -> out.put(p.farmerId(), p.date()));
        }
        return out;
    }
}
