package com.techx.intervue.modules.order.exceptions;

/** D-06: slot đã nhận đủ max_orders đơn → 409 SLOT_FULL. */
public class SlotFullException extends RuntimeException {
    public SlotFullException(long slotId) {
        super("This pickup time is full. Choose another one.");
    }
}
