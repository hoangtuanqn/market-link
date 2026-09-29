package com.techx.intervue.modules.order.exceptions;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(long orderId) {
        super("Order " + orderId + " does not exist.");
    }
}
