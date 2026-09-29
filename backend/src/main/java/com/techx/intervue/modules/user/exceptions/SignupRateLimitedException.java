package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

@Getter
public class SignupRateLimitedException extends RuntimeException {
    private final long retryAfterSeconds;

    public SignupRateLimitedException(long retryAfterSeconds) {
        super("Too many codes requested. Try again later.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }
}
