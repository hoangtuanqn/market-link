package com.techx.intervue.modules.conversation.exceptions;

/** D-09: an old thread can be read but cannot receive more messages → 409. */
public class ConversationClosedException extends RuntimeException {
    public ConversationClosedException() {
        super("This stall is not taking messages right now. You can still read older messages.");
    }
}
