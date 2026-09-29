package com.techx.intervue.modules.stall.exceptions;

public class SlotNotYoursException extends RuntimeException {
    public SlotNotYoursException() {
        super("This pickup slot is not yours.");
    }
}
