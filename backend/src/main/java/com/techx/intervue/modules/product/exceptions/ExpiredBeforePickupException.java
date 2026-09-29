package com.techx.intervue.modules.product.exceptions;

public class ExpiredBeforePickupException extends RuntimeException {
    public ExpiredBeforePickupException() {
        super("This batch is no longer good on that pickup day.");
    }
}
