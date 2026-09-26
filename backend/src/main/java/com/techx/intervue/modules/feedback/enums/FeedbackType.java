package com.techx.intervue.modules.feedback.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** FR-081: the three kinds the form offers (contract §11). */
public enum FeedbackType {
    BUG,
    SUGGESTION,
    QUERY;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Lower-case JSON value → enum; unknown text throws (the caller decides the field name). */
    public static FeedbackType parse(String value) {
        if (value == null) {
            throw new IllegalArgumentException("type must be 'bug', 'suggestion' or 'query'.");
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("type must be 'bug', 'suggestion' or 'query'.");
        }
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<FeedbackType> {
        public DbConverter() {
            super(FeedbackType.class);
        }
    }
}
