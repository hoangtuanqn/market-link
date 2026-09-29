package com.techx.intervue.modules.conversation.exceptions;

public class EmptyMessageException extends RuntimeException {
    public EmptyMessageException() {
        super("Type a message before sending.");
    }
}
