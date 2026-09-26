package com.techx.intervue.modules.user.exceptions;

/** FR-004: the password is right but the role is not the one the sign-in page requires → 403. */
public class RoleMismatchException extends RuntimeException {
    public RoleMismatchException() {
        super("This account cannot sign in here.");
    }
}
