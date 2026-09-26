package com.techx.intervue.modules.user.exceptions;

/** The password-reset token is wrong, already used or expired → 400. */
public class InvalidResetTokenException extends RuntimeException {
    public InvalidResetTokenException() {
        super("This link is invalid or has expired.");
    }
}
