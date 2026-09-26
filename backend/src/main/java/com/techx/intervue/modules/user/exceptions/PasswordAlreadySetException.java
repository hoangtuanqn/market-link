package com.techx.intervue.modules.user.exceptions;

/**
 * An account that already has a password cannot use set-password (it must use change / forgot
 * password) → 409.
 */
public class PasswordAlreadySetException extends RuntimeException {
    public PasswordAlreadySetException() {
        super("Your account already has a password.");
    }
}
