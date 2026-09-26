package com.techx.intervue.modules.conversation.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * new = nobody has looked · reviewed = an admin looked and decided not to hide · actioned = the
 * message was hidden. Matches the ENUM in migration V20260926005.
 */
public enum ReportStatus {
    NEW,
    REVIEWED,
    ACTIONED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ReportStatus> {
        public DbConverter() {
            super(ReportStatus.class);
        }
    }
}
