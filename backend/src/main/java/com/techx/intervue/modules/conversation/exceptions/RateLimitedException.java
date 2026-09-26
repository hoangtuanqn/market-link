package com.techx.intervue.modules.conversation.exceptions;

/** Spec §8.4 — 429. The message goes straight to the user to read. */
public class RateLimitedException extends RuntimeException {
    public RateLimitedException(String message) {
        super(message);
    }
}
