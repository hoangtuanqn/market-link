package com.techx.intervue.modules.conversation.exceptions;

public class CannotReportOwnMessageException extends RuntimeException {
    public CannotReportOwnMessageException() {
        super("You cannot report your own message.");
    }
}
