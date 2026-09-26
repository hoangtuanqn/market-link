package com.techx.intervue.modules.order.exceptions;

/**
 * Slot không có, đã tắt, khác ngày nhận, hoặc không phải của stall / chợ trong đơn → 409
 * SLOT_UNAVAILABLE (C5-5).
 */
public class SlotNotAvailableException extends RuntimeException {
    public SlotNotAvailableException() {
        super("This pickup time is no longer available. Choose another one.");
    }
}
