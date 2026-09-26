package com.techx.intervue.modules.conversation.exceptions;

/** An empty body or one made only of whitespace → 400. */
public class EmptyMessageException extends RuntimeException {
    public EmptyMessageException() {
        super("Type a message before sending.");
    }
}
