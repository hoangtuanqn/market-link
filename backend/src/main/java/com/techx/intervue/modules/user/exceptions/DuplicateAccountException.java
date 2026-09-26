package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

/** The email or phone number is already used for another account → 409. */
@Getter
public class DuplicateAccountException extends RuntimeException {
    private final String field;

    public DuplicateAccountException(String field, String message) {
        super(message);
        this.field = field;
    }
}
