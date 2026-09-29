package com.techx.intervue.modules.user.exceptions;

public class MfaTokenInvalidException extends RuntimeException {
    public MfaTokenInvalidException() {
        super("Your sign-in has expired. Sign in again.");
    }
}
