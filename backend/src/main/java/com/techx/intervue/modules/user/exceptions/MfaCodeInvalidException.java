package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

/**
 * FR-008: a wrong TOTP code or recovery code → 400 (not 401 because the FE reads 401 as session
 * ended).
 */
@Getter
public class MfaCodeInvalidException extends RuntimeException {
    private final int attemptsLeft;

    public MfaCodeInvalidException(int attemptsLeft) {
        super("That code is not right.");
        this.attemptsLeft = attemptsLeft;
    }
}
