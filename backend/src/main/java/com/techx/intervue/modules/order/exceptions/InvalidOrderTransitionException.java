package com.techx.intervue.modules.order.exceptions;

import com.techx.intervue.modules.order.enums.OrderStatus;

public class InvalidOrderTransitionException extends RuntimeException {
    public InvalidOrderTransitionException(OrderStatus from, OrderStatus to) {
        super(String.format("An order cannot go from %s to %s.", from.value(), to.value()));
    }
}
