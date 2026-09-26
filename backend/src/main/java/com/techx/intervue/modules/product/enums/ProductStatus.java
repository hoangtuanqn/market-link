package com.techx.intervue.modules.product.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** FR-064. The JSON value and the ENUM column keep snake_case (`sold_out`) — contract §5. */
public enum ProductStatus {
    AVAILABLE,
    SOLD_OUT,
    UNAVAILABLE;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ProductStatus> {
        public DbConverter() {
            super(ProductStatus.class);
        }
    }
}
