package com.techx.intervue.modules.stall.exceptions;

/**
 * FR-071/D-09: the stall was approved once and an admin has now suspended it → 403 STALL_SUSPENDED.
 * Kept apart from {@link StallNotApprovedException} (never approved) because the two need different
 * words: this one carries the admin's reason and, for a temporary suspension, when it lifts.
 */
public class StallSuspendedException extends RuntimeException {
    public StallSuspendedException(String message) {
        super(message);
    }
}
