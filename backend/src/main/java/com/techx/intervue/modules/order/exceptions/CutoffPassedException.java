package com.techx.intervue.modules.order.exceptions;

/** The cutoff time for this order has passed. */
public class CutoffPassedException extends RuntimeException {
    public CutoffPassedException(long orderId) {
        super(String.format("The cutoff for this order has passed."));
    }
}
