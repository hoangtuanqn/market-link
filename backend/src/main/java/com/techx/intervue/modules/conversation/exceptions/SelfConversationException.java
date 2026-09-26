package com.techx.intervue.modules.conversation.exceptions;

/** Mở thread với chính mình → 400. */
public class SelfConversationException extends RuntimeException {
    public SelfConversationException() {
        super("You cannot message yourself.");
    }
}
