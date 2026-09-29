package com.techx.intervue.modules.user.exceptions;

public class MfaStateException extends RuntimeException {
    public MfaStateException(String message) {
        super(message);
    }
}
