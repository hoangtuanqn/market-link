package com.techx.intervue.modules.conversation.exceptions;

public class RateLimitedException extends RuntimeException {
    public RateLimitedException(String message) {
        super(message);
    }
}
