package com.techx.intervue.modules.order.exceptions;

/** D-06: the slot already has max_orders orders → 409 SLOT_FULL. */
public class SlotFullException extends RuntimeException {
    public SlotFullException(long slotId) {
        super("This pickup time is full. Choose another one.");
    }
}
