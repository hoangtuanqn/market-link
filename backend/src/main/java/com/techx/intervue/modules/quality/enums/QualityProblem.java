package com.techx.intervue.modules.quality.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * FR-122: what the customer saw. Matches ENUM('bruised','mold','smell','wilted','other') in
 * V20260928014; the JSON value is the same lowercase word.
 */
public enum QualityProblem {
    BRUISED,
    MOLD,
    SMELL,
    WILTED,
    OTHER;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<QualityProblem> {
        public DbConverter() {
            super(QualityProblem.class);
        }
    }
}
