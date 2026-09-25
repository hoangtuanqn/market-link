package com.techx.intervue.modules.farmer.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

public enum ApprovalStatus {
    PENDING,
    APPROVED,
    REJECTED,
    SUSPENDED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ApprovalStatus> {
        public DbConverter() {
            super(ApprovalStatus.class);
        }
    }
}
