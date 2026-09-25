package com.techx.intervue.modules.conversation.exceptions;

/** Tài khoản của chính người gọi không còn hoạt động → 403. */
public class AccountRestrictedException extends RuntimeException {
    public AccountRestrictedException() {
        super("Your account cannot send messages.");
    }
}
