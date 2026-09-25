package com.techx.intervue.modules.user.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

public enum SocialProvider {
    GOOGLE;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<SocialProvider> {
        public DbConverter() {
            super(SocialProvider.class);
        }
    }
}
