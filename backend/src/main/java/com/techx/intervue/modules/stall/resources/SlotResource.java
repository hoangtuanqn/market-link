package com.techx.intervue.modules.stall.resources;

import com.techx.intervue.modules.stall.entities.PickupSlot;
import java.time.format.DateTimeFormatter;

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
