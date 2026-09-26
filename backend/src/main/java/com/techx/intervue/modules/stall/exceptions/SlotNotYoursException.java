package com.techx.intervue.modules.stall.exceptions;

/** R-06: `{slotId}` belongs to another stall → 403, even when the row is real. */
public class SlotNotYoursException extends RuntimeException {
    public SlotNotYoursException() {
        super("This pickup slot is not yours.");
    }
}
