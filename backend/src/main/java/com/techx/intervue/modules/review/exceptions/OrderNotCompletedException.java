package com.techx.intervue.modules.review.exceptions;

/** D-10: a review needs a completed order — 403 ORDER_NOT_COMPLETED. */
public class OrderNotCompletedException extends RuntimeException {
    public OrderNotCompletedException() {
        super("You can review this order once it is completed.");
    }
}
