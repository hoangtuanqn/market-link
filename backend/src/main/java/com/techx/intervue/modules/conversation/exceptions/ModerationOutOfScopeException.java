package com.techx.intervue.modules.conversation.exceptions;

public class ModerationOutOfScopeException extends RuntimeException {
    public ModerationOutOfScopeException() {
        super("Admins can only act on messages that have been reported.");
    }
}
