package com.techx.intervue.modules.conversation.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** Matches ENUM('text','image','video','offer','system') in migration V20260928010. */
public enum MessageKind {
    TEXT,
    IMAGE,
    VIDEO,
    OFFER,
    SYSTEM;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<MessageKind> {
        public DbConverter() {
            super(MessageKind.class);
        }
    }
}
