package com.techx.intervue.modules.stall.exceptions;

/** D-06: cannot lower max_orders below the number of orders already placed into the slot → 409. */
public class SlotBelowBookedException extends RuntimeException {
    public SlotBelowBookedException(int bookedCount) {
        super("This slot already has " + bookedCount + " orders; capacity cannot go below that.");
    }
}
