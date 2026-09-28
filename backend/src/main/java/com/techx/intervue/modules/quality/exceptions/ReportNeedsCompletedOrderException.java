package com.techx.intervue.modules.quality.exceptions;

/** Spec §8: an order that is not completed yet cannot be reported — 409 ORDER_NOT_COMPLETED. */
public class ReportNeedsCompletedOrderException extends RuntimeException {
    public ReportNeedsCompletedOrderException() {
        super("You can report a problem once the order is completed.");
    }
}
