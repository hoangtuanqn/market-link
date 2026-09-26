package com.techx.intervue.modules.order.exceptions;

/** R-06: đơn có thật nhưng không phải của khách / stall đang gọi → 403, không phải 404. */
public class OrderNotYoursException extends RuntimeException {
    public OrderNotYoursException() {
        super("This order belongs to another account.");
    }
}
