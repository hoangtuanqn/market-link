package com.techx.intervue.modules.order.exceptions;

public class CutoffPassedException extends RuntimeException {
    public CutoffPassedException(long orderId) {
        super(String.format("The cutoff for this order has passed."));
    }

    public CutoffPassedException() {
        super("It is too late to order for this pickup time. Choose a later one.");
    }
}
