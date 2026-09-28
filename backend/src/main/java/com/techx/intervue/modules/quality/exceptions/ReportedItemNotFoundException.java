package com.techx.intervue.modules.quality.exceptions;

/** The line id is not one of this order's lines — 404, the caller owns the order. */
public class ReportedItemNotFoundException extends RuntimeException {
    public ReportedItemNotFoundException() {
        super("This item is not part of the order.");
    }
}
