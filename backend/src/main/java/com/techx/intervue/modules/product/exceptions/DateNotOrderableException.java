package com.techx.intervue.modules.product.exceptions;

/**
 * FR-124: customers can no longer order for that pickup day — no free slot before its cutoff, the
 * market or the stall is closed, no weekly template for that weekday, or beyond the 14-day window →
 * 409.
 */
public class DateNotOrderableException extends RuntimeException {
    public DateNotOrderableException() {
        super("Customers can no longer order for that pickup day.");
    }
}
