package com.techx.intervue.converters;

import jakarta.persistence.AttributeConverter;
import java.util.Locale;

/** Maps a Java enum (CUSTOMER) to a lowercase ENUM value in MySQL ('customer'). */
public abstract class LowercaseEnumConverter<E extends Enum<E>>
        implements AttributeConverter<E, String> {

    private final Class<E> type;

    protected LowercaseEnumConverter(Class<E> type) {
        this.type = type;
    }

    @Override
    public String convertToDatabaseColumn(E value) {
        return value == null ? null : value.name().toLowerCase(Locale.ROOT);
    }

    @Override
    public E convertToEntityAttribute(String value) {
        return value == null ? null : Enum.valueOf(type, value.toUpperCase(Locale.ROOT));
    }
}
