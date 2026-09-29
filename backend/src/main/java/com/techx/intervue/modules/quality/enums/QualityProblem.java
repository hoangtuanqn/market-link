package com.techx.intervue.modules.quality.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

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
