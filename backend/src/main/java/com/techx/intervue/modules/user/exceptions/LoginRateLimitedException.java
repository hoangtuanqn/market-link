package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

@Getter
public class LoginRateLimitedException extends RuntimeException {
    private final long retryAfterSeconds;

    public LoginRateLimitedException(long retryAfterSeconds) {
        super(
                "Too many failed sign-in attempts. Try again in "
                        + Math.max(1, (retryAfterSeconds + 59) / 60)
                        + " minutes.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }
}
