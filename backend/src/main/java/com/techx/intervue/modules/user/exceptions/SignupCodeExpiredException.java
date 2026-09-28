package com.techx.intervue.modules.user.exceptions;

/** FR-009: the code expired or its tries are used up → the person asks for a new one. */
public class SignupCodeExpiredException extends RuntimeException {
    public SignupCodeExpiredException() {
        super("This code can no longer be used. Send a new one.");
    }
}
