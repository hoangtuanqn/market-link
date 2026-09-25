package com.techx.intervue.modules.conversation.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** Khớp ENUM('text','image','offer','system') trong migration V20260925006. */
public enum MessageKind {
    TEXT,
    IMAGE,
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
