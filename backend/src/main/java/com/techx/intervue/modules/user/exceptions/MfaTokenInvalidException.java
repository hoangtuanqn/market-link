package com.techx.intervue.modules.user.exceptions;

/**
 * FR-008: the pending-code token is wrong, already used or over 5 minutes old → 400, the user must
 * sign in again.
 */
public class MfaTokenInvalidException extends RuntimeException {
    public MfaTokenInvalidException() {
        super("Your sign-in has expired. Sign in again.");
    }
}
