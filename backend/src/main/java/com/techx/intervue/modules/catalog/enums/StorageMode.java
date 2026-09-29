package com.techx.intervue.modules.catalog.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

public enum StorageMode {
    ROOM,
    CHILLED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static StorageMode parse(String raw) {
        if (raw != null) {
            for (StorageMode mode : values()) {
                if (mode.value().equalsIgnoreCase(raw.trim())) {
                    return mode;
                }
            }
        }
        throw new IllegalArgumentException("Unknown storage mode. Use room or chilled.");
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<StorageMode> {
        public DbConverter() {
            super(StorageMode.class);
        }
    }
}
