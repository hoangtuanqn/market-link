package com.techx.intervue.modules.favorite.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** What a favourite points at (contract §9). JSON and the ENUM column use the lowercase value. */
public enum FavoriteTargetType {
    FARMER,
    PRODUCT,
    MARKET;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** "product" → PRODUCT; anything else → IllegalArgumentException (400). */
    public static FavoriteTargetType parse(String raw) {
        for (FavoriteTargetType t : values()) {
            if (t.value().equals(raw)) {
                return t;
            }
        }
        throw new IllegalArgumentException("targetType must be farmer, product or market.");
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<FavoriteTargetType> {
        public DbConverter() {
            super(FavoriteTargetType.class);
        }
    }
}
