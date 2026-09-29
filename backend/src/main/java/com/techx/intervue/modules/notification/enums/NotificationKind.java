package com.techx.intervue.modules.notification.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

public enum NotificationKind {
    ANNOUNCEMENT(NotificationCategory.ANNOUNCEMENTS, true),
    FARMER_APPLICATION(NotificationCategory.FARMER_APPLICATIONS, true),
    FEEDBACK(NotificationCategory.FEEDBACK, true),
    FARMER_APPROVED(NotificationCategory.ACCOUNT, true),
    FARMER_REJECTED(NotificationCategory.ACCOUNT, true),
    FARMER_SUSPENDED(NotificationCategory.ACCOUNT, true),
    FARMER_REINSTATED(NotificationCategory.ACCOUNT, true),
    ORDER_PLACED(NotificationCategory.ORDERS, true),
    ORDER_ACCEPTED(NotificationCategory.ORDERS, true),
    ORDER_DECLINED(NotificationCategory.ORDERS, true),
    ORDER_READY(NotificationCategory.ORDERS, true),
    ORDER_CANCELLED(NotificationCategory.ORDERS, true),
    ORDER_CHANGED(NotificationCategory.ORDERS, true),
    ORDER_CANCELLED_ACCOUNT_DEACTIVATED(NotificationCategory.ORDERS, true),
    RESTOCK(NotificationCategory.FAVORITES, true),
    QUALITY_REPORTED(NotificationCategory.ORDERS, true),
    QUALITY_ESCALATED(NotificationCategory.QUALITY_REPORTS, true),
    QUALITY_DECIDED(NotificationCategory.ORDERS, true),
    SHELF_LIFE_VIOLATION(NotificationCategory.ORDERS, true),
    SHELF_LIFE_LOCKED(NotificationCategory.ORDERS, true),
    MESSAGE(NotificationCategory.MESSAGES, false),
    TEST(null, false);

    private final NotificationCategory category;
    private final boolean persistent;

    NotificationKind(NotificationCategory category, boolean persistent) {
        this.category = category;
        this.persistent = persistent;
    }

    public NotificationCategory category() {
        return category;
    }

    public boolean persistent() {
        return persistent;
    }

    @JsonValue
    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }

    @Converter(autoApply = true)
    public static class DbConverter extends LowercaseEnumConverter<NotificationKind> {
        public DbConverter() {
            super(NotificationKind.class);
        }
    }
}
