package com.techx.intervue.modules.conversation.exceptions;

public class ConversationAccessDeniedException extends RuntimeException {
    public ConversationAccessDeniedException() {
        super("You are not part of this conversation.");
    }
}
