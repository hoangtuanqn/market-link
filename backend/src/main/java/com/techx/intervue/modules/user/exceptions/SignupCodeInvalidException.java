package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

@Getter
public class SignupCodeInvalidException extends RuntimeException {
    private final int attemptsLeft;

    public SignupCodeInvalidException(int attemptsLeft) {
        super("That code is not right.");
        this.attemptsLeft = attemptsLeft;
    }
}
