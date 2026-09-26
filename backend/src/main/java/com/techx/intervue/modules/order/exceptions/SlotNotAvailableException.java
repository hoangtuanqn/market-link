package com.techx.intervue.modules.order.exceptions;

/**
 * The slot does not exist, is disabled, on a different pickup day, or does not belong to the stall
 * / market in the order → 409 SLOT_UNAVAILABLE (C5-5).
 */
public class SlotNotAvailableException extends RuntimeException {
    public SlotNotAvailableException() {
        super("This pickup time is no longer available. Choose another one.");
    }
}
