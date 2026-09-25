package com.techx.intervue.modules.conversation.exceptions;

/** Spec §8.4 — 429. Thông điệp đi thẳng ra cho người dùng đọc. */
public class RateLimitedException extends RuntimeException {
    public RateLimitedException(String message) {
        super(message);
    }
}
