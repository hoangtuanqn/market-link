package com.techx.intervue.modules.user.exceptions;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;

@Getter
public class DuplicateAccountException extends RuntimeException {
    private final Map<String, String> fields;

    public DuplicateAccountException(String field, String message) {
        this(Map.of(field, message));
    }

    public DuplicateAccountException(Map<String, String> fields) {
        super(fields.values().iterator().next());
        this.fields = Collections.unmodifiableMap(new LinkedHashMap<>(fields));
    }
}
