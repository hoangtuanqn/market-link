package com.techx.intervue.modules.quality.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * FR-122, FR-123: open until an admin decides; confirmed or dismissed after. Matches
 * ENUM('open','confirmed','dismissed') in V20260928006.
 */
public enum QualityReportStatus {
    OPEN,
    CONFIRMED,
    DISMISSED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<QualityReportStatus> {
        public DbConverter() {
            super(QualityReportStatus.class);
        }
    }
}
