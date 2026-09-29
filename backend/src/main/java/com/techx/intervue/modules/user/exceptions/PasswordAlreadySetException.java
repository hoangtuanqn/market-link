package com.techx.intervue.modules.user.exceptions;

public class PasswordAlreadySetException extends RuntimeException {
    public PasswordAlreadySetException() {
        super("Your account already has a password.");
    }
}
