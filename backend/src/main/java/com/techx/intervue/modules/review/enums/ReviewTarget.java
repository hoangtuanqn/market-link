package com.techx.intervue.modules.review.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** What a review is about (contract §8 `targetType`): a product line of the order, or the stall. */
public enum ReviewTarget {
    PRODUCT,
    FARMER;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Lower-case JSON value → enum; unknown text is a 400 (`IllegalArgumentException`). */
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
