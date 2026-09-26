package com.techx.intervue.modules.stall.exceptions;

public class SlotNotFoundException extends RuntimeException {
    public SlotNotFoundException() {
        super("Pickup slot not found.");
    }
}
