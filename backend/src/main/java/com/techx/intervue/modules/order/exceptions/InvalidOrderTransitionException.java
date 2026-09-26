package com.techx.intervue.modules.order.exceptions;

import com.techx.intervue.modules.order.enums.OrderStatus;

/** An order cannot transition from one status to another if not allowed. */
public class InvalidOrderTransitionException extends RuntimeException {
    public InvalidOrderTransitionException(OrderStatus from, OrderStatus to) {
        super(String.format("An order cannot go from %s to %s.", from.value(), to.value()));
    }
}
