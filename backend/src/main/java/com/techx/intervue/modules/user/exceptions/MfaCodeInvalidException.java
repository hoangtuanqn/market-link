package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

/** FR-008: mã TOTP hoặc mã khôi phục sai → 400 (không dùng 401 vì FE hiểu 401 là hết phiên). */
@Getter
public class MfaCodeInvalidException extends RuntimeException {
    private final int attemptsLeft;

    public MfaCodeInvalidException(int attemptsLeft) {
        super("That code is not right.");
        this.attemptsLeft = attemptsLeft;
    }
}
