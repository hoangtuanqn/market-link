package com.techx.intervue.modules.order.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

public enum OrderStatus {
    PLACED,
    ACCEPTED,
    DECLINED,
    READY,
    COMPLETED,
    CANCELLED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<OrderStatus> {
        public DbConverter() {
            super(OrderStatus.class);
        }
    }
}
