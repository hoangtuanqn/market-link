package com.techx.intervue.modules.user.exceptions;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;

/** The email or phone number is already used for another account → 409. */
@Getter
public class DuplicateAccountException extends RuntimeException {
    /**
     * Every field that is already taken → its message, in form order, so the form can mark both
     * email and phone in one round trip instead of one at a time.
     */
    private final Map<String, String> fields;

    public DuplicateAccountException(String field, String message) {
        this(Map.of(field, message));
    }

    public DuplicateAccountException(Map<String, String> fields) {
        super(fields.values().iterator().next());
        this.fields = Collections.unmodifiableMap(new LinkedHashMap<>(fields));
    }
}
