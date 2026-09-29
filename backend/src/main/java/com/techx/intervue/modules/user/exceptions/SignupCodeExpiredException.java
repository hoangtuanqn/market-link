package com.techx.intervue.modules.user.exceptions;

public class SignupCodeExpiredException extends RuntimeException {
    public SignupCodeExpiredException() {
        super("This code can no longer be used. Send a new one.");
    }
}
