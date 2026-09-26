package com.techx.intervue.modules.conversation.exceptions;

/**
 * Spec §8.3: an admin's right to read and hide comes from a report, not from the role. A message
 * nobody reported is out of reach — 403, and the message states that boundary plainly so the admin
 * knows.
 */
public class ModerationOutOfScopeException extends RuntimeException {
    public ModerationOutOfScopeException() {
        super("Admins can only act on messages that have been reported.");
    }
}
