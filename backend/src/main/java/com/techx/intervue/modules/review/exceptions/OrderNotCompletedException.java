package com.techx.intervue.modules.review.exceptions;

public class OrderNotCompletedException extends RuntimeException {
    public OrderNotCompletedException() {
        super("You can review this order once it is completed.");
    }
}
