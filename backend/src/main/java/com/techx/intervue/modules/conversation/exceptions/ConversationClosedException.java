package com.techx.intervue.modules.conversation.exceptions;

public class ConversationClosedException extends RuntimeException {
    public ConversationClosedException() {
        super("This stall is not taking messages right now. You can still read older messages.");
    }
}
