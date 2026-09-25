package com.techx.intervue.modules.conversation.exceptions;

/** D-09: thread cũ đọc được nhưng không gửi thêm được → 409. */
public class ConversationClosedException extends RuntimeException {
    public ConversationClosedException() {
        super("This stall is not taking messages right now. You can still read older messages.");
    }
}
