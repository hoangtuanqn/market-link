package com.techx.intervue.modules.user.exceptions;

/** FR-008: an operation that does not fit the current state (already on, not set up yet…) → 409. */
public class MfaStateException extends RuntimeException {
    public MfaStateException(String message) {
        super(message);
    }
}
