package com.techx.intervue.modules.review.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** FR-074: an admin hides a review; hidden reviews leave the public lists and the rating caches. */
public enum ReviewStatus {
    VISIBLE,
    HIDDEN;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ReviewStatus> {
        public DbConverter() {
            super(ReviewStatus.class);
        }
    }
}
