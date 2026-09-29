package com.techx.intervue.modules.review.exceptions;

public class TargetNotInOrderException extends RuntimeException {
    public TargetNotInOrderException() {
        super("You can only review what you bought in this order.");
    }
}
