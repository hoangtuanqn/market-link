package com.techx.intervue.modules.order.requests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/** FR-125: {@code pickupDateByFarmer()} is the only logic on this record. */
class PreviewRequestTest {

    private static final long FARMER_A = 10L;
    private static final long FARMER_B = 20L;

    @Test
    void pickupDateByFarmerIsEmptyWhenPickupDatesIsNull() {
        PreviewRequest request = new PreviewRequest(List.of(), null);

        assertThat(request.pickupDateByFarmer()).isEmpty();
    }

    /** The client re-sending an updated day for a stall keeps only the last one. */
    @Test
    void pickupDateByFarmerKeepsTheLastEntryWhenAStallIsListedTwice() {
        LocalDate firstPick = LocalDate.of(2026, 9, 28);
        LocalDate changedMind = LocalDate.of(2026, 10, 3);
        LocalDate untouched = LocalDate.of(2026, 9, 29);
        PreviewRequest request =
                new PreviewRequest(
                        List.of(),
                        List.of(
                                new PickupDateInput(FARMER_A, firstPick),
                                new PickupDateInput(FARMER_B, untouched),
                                new PickupDateInput(FARMER_A, changedMind)));

        assertThat(request.pickupDateByFarmer())
                .containsEntry(FARMER_A, changedMind)
                .containsEntry(FARMER_B, untouched);
    }
}
