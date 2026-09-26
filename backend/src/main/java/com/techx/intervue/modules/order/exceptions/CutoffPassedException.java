package com.techx.intervue.modules.order.exceptions;

/** The cutoff time for this order has passed. */
public class CutoffPassedException extends RuntimeException {
    public CutoffPassedException(long orderId) {
        super(String.format("The cutoff for this order has passed."));
    }

    /**
     * At order time: no order exists yet, the chosen slot is already past the stall's cutoff time
     * (D-05).
     */
    public CutoffPassedException() {
        super("It is too late to order for this pickup time. Choose a later one.");
    }
}
