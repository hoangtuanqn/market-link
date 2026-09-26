package com.techx.intervue.modules.conversation.exceptions;

/** Opening a thread with yourself → 400. */
public class SelfConversationException extends RuntimeException {
    public SelfConversationException() {
        super("You cannot message yourself.");
    }
}
