package com.techx.intervue.modules.stall.exceptions;

/**
 * D-09: not yet approved (or currently suspended) so writing the selling profile is not allowed →
 * 403 (contract §4).
 */
public class StallNotApprovedException extends RuntimeException {
    public StallNotApprovedException() {
        super("Your stall is pending admin approval.");
    }
}
