package com.techx.intervue.modules.user.exceptions;

public class SignupExpiredException extends RuntimeException {
    public SignupExpiredException() {
        super("Your sign-up has expired. Fill in the form again.");
    }
}
