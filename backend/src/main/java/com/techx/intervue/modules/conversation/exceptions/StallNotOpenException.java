package com.techx.intervue.modules.conversation.exceptions;

/** The recipient is not an open stall → 403. */
public class StallNotOpenException extends RuntimeException {
    public StallNotOpenException() {
        super("This stall is not open yet.");
    }
}
