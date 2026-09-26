package com.techx.intervue.modules.order.exceptions;

/**
 * D-09: a stall not yet approved or currently suspended does not accept new orders → 409
 * STALL_UNAVAILABLE.
 */
public class StallUnavailableException extends RuntimeException {
    public StallUnavailableException(Long farmerId) {
        super("This stall is not taking orders right now.");
    }
}
