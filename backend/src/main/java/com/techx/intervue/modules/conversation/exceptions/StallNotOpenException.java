package com.techx.intervue.modules.conversation.exceptions;

public class StallNotOpenException extends RuntimeException {
    public StallNotOpenException() {
        super("This stall is not open yet.");
    }
}
