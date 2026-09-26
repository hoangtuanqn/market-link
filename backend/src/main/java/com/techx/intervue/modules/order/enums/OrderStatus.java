package com.techx.intervue.modules.order.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** FR-033. Giá trị JSON và cột ENUM giữ lowercase (`placed`) — contract §5. */
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
