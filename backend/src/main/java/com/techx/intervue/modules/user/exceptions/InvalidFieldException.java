package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

/**
 * A business error tied to one form field (e.g. the password confirmation does not match) → 400.
 */
@Getter
public class InvalidFieldException extends RuntimeException {
    private final String field;

    public InvalidFieldException(String field, String message) {
        super(message);
        this.field = field;
    }
}
