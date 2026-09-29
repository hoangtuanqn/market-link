package com.techx.intervue.modules.stall.exceptions;

public class SlotBelowBookedException extends RuntimeException {
    public SlotBelowBookedException(int bookedCount) {
        super("This slot already has " + bookedCount + " orders; capacity cannot go below that.");
    }
}
