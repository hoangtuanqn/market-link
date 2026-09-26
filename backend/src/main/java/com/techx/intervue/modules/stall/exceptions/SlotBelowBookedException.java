package com.techx.intervue.modules.stall.exceptions;

/** D-06: không hạ max_orders xuống dưới số đơn đã đặt vào slot → 409. */
public class SlotBelowBookedException extends RuntimeException {
    public SlotBelowBookedException(int bookedCount) {
        super("This slot already has " + bookedCount + " orders; capacity cannot go below that.");
    }
}
