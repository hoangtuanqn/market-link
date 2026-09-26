package com.techx.intervue.modules.farmer.exceptions;

/** Approve/suspend when the current state is not in the allowed flow → 409 (D-04-style). */
public class InvalidApprovalTransitionException extends RuntimeException {
    public InvalidApprovalTransitionException(String message) {
        super(message);
    }
}
