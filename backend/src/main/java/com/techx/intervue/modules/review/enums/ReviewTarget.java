package com.techx.intervue.modules.review.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

public enum ReviewTarget {
    PRODUCT,
    FARMER;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static ReviewTarget parse(String value) {
        if (value == null) {
            throw new IllegalArgumentException("targetType must be 'product' or 'farmer'.");
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("targetType must be 'product' or 'farmer'.");
        }
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ReviewTarget> {
        public DbConverter() {
            super(ReviewTarget.class);
        }
    }
}
