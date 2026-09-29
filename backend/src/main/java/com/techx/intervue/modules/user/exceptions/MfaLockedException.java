package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

@Getter
public class MfaLockedException extends RuntimeException {
    private final long retryAfterSeconds;

    public MfaLockedException(long retryAfterSeconds) {
        super(
                "Too many wrong codes. Try again in "
                        + Math.max(1, (retryAfterSeconds + 59) / 60)
                        + " minutes.");
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
