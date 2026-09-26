package com.techx.intervue.modules.stall.exceptions;

/** R-06: `{slotId}` thuộc stall khác → 403, kể cả khi dòng có thật. */
public class SlotNotYoursException extends RuntimeException {
    public SlotNotYoursException() {
        super("This pickup slot is not yours.");
    }
}
