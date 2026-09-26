package com.techx.intervue.modules.stall.services.interfaces;

import com.techx.intervue.modules.stall.requests.GenerateSlotsRequest;
import com.techx.intervue.modules.stall.requests.UpdateSlotRequest;
import com.techx.intervue.modules.stall.resources.SlotResource;
import java.time.LocalDate;
import java.util.List;

/** FR-032, FR-067 — slot nhận hàng (contract §6). */
public interface SlotServiceInterface {

    List<SlotResource> generateSlots(long userId, GenerateSlotsRequest request);

    SlotResource updateSlot(long userId, long slotId, UpdateSlotRequest request);

    List<SlotResource> publicSlots(long farmerId, Long marketId, LocalDate date);
}
