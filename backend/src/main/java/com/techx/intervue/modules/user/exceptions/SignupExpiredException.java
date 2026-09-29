package com.techx.intervue.modules.user.exceptions;

/** FR-009: the parked sign-up is gone (30 minutes) → the person fills in the form again. */
public class SignupExpiredException extends RuntimeException {
    public SignupExpiredException() {
        super("Your sign-up has expired. Fill in the form again.");
    }
}
