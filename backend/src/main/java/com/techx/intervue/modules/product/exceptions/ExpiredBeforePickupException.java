package com.techx.intervue.modules.product.exceptions;

/** FR-124: the batch's last good day is before the pickup day → 400. */
public class ExpiredBeforePickupException extends RuntimeException {
    public ExpiredBeforePickupException() {
        super("This batch is no longer good on that pickup day.");
    }
}
