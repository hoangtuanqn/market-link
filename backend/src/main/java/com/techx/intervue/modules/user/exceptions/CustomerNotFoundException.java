package com.techx.intervue.modules.user.exceptions;

/** FR-072: no user with that id → 404. */
public class CustomerNotFoundException extends RuntimeException {
    public CustomerNotFoundException() {
        super("Customer not found.");
    }
}
