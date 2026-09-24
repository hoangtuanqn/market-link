package com.techx.intervue.modules.user.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

public enum UserStatus {
    ACTIVE,
    INACTIVE,
    SUSPENDED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<UserStatus> {
        public DbConverter() {
            super(UserStatus.class);
        }
    }
}
