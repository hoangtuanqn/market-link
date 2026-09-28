package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

/** FR-009: a wrong sign-up code → 400 with the tries left for this code. */
@Getter
public class SignupCodeInvalidException extends RuntimeException {
    private final int attemptsLeft;

    public SignupCodeInvalidException(int attemptsLeft) {
        super("That code is not right.");
        this.attemptsLeft = attemptsLeft;
    }
}
