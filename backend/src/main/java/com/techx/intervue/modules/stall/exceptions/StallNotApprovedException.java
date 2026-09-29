package com.techx.intervue.modules.stall.exceptions;

public class StallNotApprovedException extends RuntimeException {
    public StallNotApprovedException() {
        super("Your stall is pending admin approval.");
    }
}
