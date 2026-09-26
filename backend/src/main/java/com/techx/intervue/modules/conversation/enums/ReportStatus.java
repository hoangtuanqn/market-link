package com.techx.intervue.modules.conversation.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * new = chưa ai xem · reviewed = admin đã xem và quyết định không ẩn · actioned = đã ẩn tin. Khớp
 * ENUM trong migration V20260926005.
 */
public enum ReportStatus {
    NEW,
    REVIEWED,
    ACTIONED;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<ReportStatus> {
        public DbConverter() {
            super(ReportStatus.class);
        }
    }
}
