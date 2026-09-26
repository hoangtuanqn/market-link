package com.techx.intervue.modules.stall.resources;

import com.techx.intervue.modules.stall.entities.PickupSlot;
import java.time.format.DateTimeFormatter;

/**
 * One pickup slot (contract §6): date "yyyy-MM-dd", time "HH:mm". `isActive` is always true on the
 * public list; the Farmer needs it after a PATCH.
 */
public record SlotResource(
        Long slotId,
        Long farmerMarketId,
        Long marketId,
        String slotDate,
        String startTime,
        String endTime,
        int maxOrders,
        int bookedCount,
        boolean isFull,
        boolean isActive) {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    /** The "full" rule lives in one place: bookedCount ≥ maxOrders (D-06). */
    public static SlotResource of(PickupSlot slot, long marketId) {
        return new SlotResource(
                slot.getId(),
                slot.getFarmerMarketId(),
                marketId,
                slot.getSlotDate().toString(),
                slot.getStartTime().format(HH_MM),
                slot.getEndTime().format(HH_MM),
                slot.getMaxOrders(),
                slot.getBookedCount(),
                slot.getBookedCount() >= slot.getMaxOrders(),
                slot.isActive());
    }
}
