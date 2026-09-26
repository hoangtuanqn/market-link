package com.techx.intervue.modules.order.exceptions;

/** R-06: the order is real but does not belong to the calling customer / stall → 403, not 404. */
public class OrderNotYoursException extends RuntimeException {
    public OrderNotYoursException() {
        super("This order belongs to another account.");
    }
}
