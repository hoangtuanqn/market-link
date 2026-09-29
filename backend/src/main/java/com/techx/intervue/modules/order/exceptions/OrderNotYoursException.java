package com.techx.intervue.modules.order.exceptions;

public class OrderNotYoursException extends RuntimeException {
    public OrderNotYoursException() {
        super("This order belongs to another account.");
    }
}
