package com.techx.intervue.modules.conversation.exceptions;

public class SelfConversationException extends RuntimeException {
    public SelfConversationException() {
        super("You cannot message yourself.");
    }
}
