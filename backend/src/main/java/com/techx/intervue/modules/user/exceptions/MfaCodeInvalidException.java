package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

@Getter
public class MfaCodeInvalidException extends RuntimeException {
    private final int attemptsLeft;

    public MfaCodeInvalidException(int attemptsLeft) {
        super("That code is not right.");
        this.attemptsLeft = attemptsLeft;
    }
}
