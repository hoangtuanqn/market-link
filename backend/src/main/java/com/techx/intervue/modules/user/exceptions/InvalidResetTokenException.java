package com.techx.intervue.modules.user.exceptions;

public class InvalidResetTokenException extends RuntimeException {
    public InvalidResetTokenException() {
        super("This link is invalid or has expired.");
    }
}
