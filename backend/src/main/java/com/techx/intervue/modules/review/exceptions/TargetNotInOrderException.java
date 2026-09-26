package com.techx.intervue.modules.review.exceptions;

/** The product or stall was not part of that order — 400. */
public class TargetNotInOrderException extends RuntimeException {
    public TargetNotInOrderException() {
        super("You can only review what you bought in this order.");
    }
}
