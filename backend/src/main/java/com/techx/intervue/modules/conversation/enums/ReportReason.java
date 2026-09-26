package com.techx.intervue.modules.conversation.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** Matches ENUM('spam','abuse','scam','other') in migration V20260926005. */
public enum ReportReason {
    SPAM,
    ABUSE,
    SCAM,
    OTHER;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ReportReason> {
        public DbConverter() {
            super(ReportReason.class);
        }
    }
}
