package com.techx.intervue.modules.user.exceptions;

public class RoleMismatchException extends RuntimeException {
    public RoleMismatchException() {
        super("This account cannot sign in here.");
    }
}
