package com.techx.intervue.modules.conversation.exceptions;

/** Spec §8.5: a sender cannot delete their own message, so they cannot report it either. 400. */
public class CannotReportOwnMessageException extends RuntimeException {
    public CannotReportOwnMessageException() {
        super("You cannot report your own message.");
    }
}
