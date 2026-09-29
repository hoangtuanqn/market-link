package com.techx.intervue.modules.order.exceptions;

public class SlotNotAvailableException extends RuntimeException {
    public SlotNotAvailableException() {
        super("This pickup time is no longer available. Choose another one.");
    }
}
