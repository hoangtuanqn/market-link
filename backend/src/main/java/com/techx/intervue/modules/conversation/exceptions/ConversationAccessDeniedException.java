package com.techx.intervue.modules.conversation.exceptions;

/** R-06: không phải thành viên của thread → 403. */
public class ConversationAccessDeniedException extends RuntimeException {
    public ConversationAccessDeniedException() {
        super("You are not part of this conversation.");
    }
}
