package com.techx.intervue.modules.quality.exceptions;

public class ReportNeedsCompletedOrderException extends RuntimeException {
    public ReportNeedsCompletedOrderException() {
        super("You can report a problem once the order is completed.");
    }
}
