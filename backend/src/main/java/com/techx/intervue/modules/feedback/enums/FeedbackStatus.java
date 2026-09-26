package com.techx.intervue.modules.feedback.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** Admin queue state; every submission starts as {@code new}. */
public enum FeedbackStatus {
    NEW,
    REVIEWED,
    RESOLVED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Lower-case JSON value → enum; unknown text throws (the caller decides the field name). */
    public static FeedbackStatus parse(String value) {
        if (value == null) {
            throw new IllegalArgumentException("status must be 'new', 'reviewed' or 'resolved'.");
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("status must be 'new', 'reviewed' or 'resolved'.");
        }
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<FeedbackStatus> {
        public DbConverter() {
            super(FeedbackStatus.class);
        }
    }
}
