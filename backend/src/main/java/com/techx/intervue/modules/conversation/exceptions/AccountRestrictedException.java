package com.techx.intervue.modules.conversation.exceptions;

/** The caller's own account is no longer active → 403. */
public class AccountRestrictedException extends RuntimeException {
    public AccountRestrictedException() {
        super("Your account cannot send messages.");
    }
}
