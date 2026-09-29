package com.techx.intervue.modules.conversation.exceptions;

public class AccountRestrictedException extends RuntimeException {
    public AccountRestrictedException() {
        super("Your account cannot send messages.");
    }
}
