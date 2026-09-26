package com.techx.intervue.modules.order.exceptions;

/**
 * An order id that does not exist → 404 NOT_FOUND. Unlike {@link OrderNotYoursException} (403):
 * this is for when the row really is not there, not when it exists but belongs to someone else
 * (R-06, Review focus #3).
 */
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(long orderId) {
        super("Order " + orderId + " does not exist.");
    }
}
