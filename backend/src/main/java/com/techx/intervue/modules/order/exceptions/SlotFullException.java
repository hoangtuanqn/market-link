package com.techx.intervue.modules.order.exceptions;

public class SlotFullException extends RuntimeException {
    public SlotFullException(long slotId) {
        super("This pickup time is full. Choose another one.");
    }
}
