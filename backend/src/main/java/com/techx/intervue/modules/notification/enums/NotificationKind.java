package com.techx.intervue.modules.notification.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * Notification kind (spec §3). persistent = stored in the notifications table (shown at
 * /notifications and in the bell count); chat messages and "Send test" are only pushed to the
 * screen.
 */
public enum NotificationKind {
    ANNOUNCEMENT(NotificationCategory.ANNOUNCEMENTS, true),
    FARMER_APPLICATION(NotificationCategory.FARMER_APPLICATIONS, true),
    FEEDBACK(NotificationCategory.FEEDBACK, true),
    FARMER_APPROVED(NotificationCategory.ACCOUNT, true),
    FARMER_REJECTED(NotificationCategory.ACCOUNT, true),
    FARMER_SUSPENDED(NotificationCategory.ACCOUNT, true),
    FARMER_REINSTATED(NotificationCategory.ACCOUNT, true),
    /**
     * FR-042/D-11: the order lifecycle milestones — placed, accepted, declined, ready, cancelled.
     */
    ORDER_PLACED(NotificationCategory.ORDERS, true),
    ORDER_ACCEPTED(NotificationCategory.ORDERS, true),
    ORDER_DECLINED(NotificationCategory.ORDERS, true),
    ORDER_READY(NotificationCategory.ORDERS, true),
    ORDER_CANCELLED(NotificationCategory.ORDERS, true),
    /**
     * FR-072: an admin permanently deactivated the customer — distinct wording from ORDER_CANCELLED
     * so the Farmer is not told the customer cancelled it themselves.
     */
    ORDER_CANCELLED_ACCOUNT_DEACTIVATED(NotificationCategory.ORDERS, true),
    /** FR-041: a favourite product went from no stock to some stock. */
    RESTOCK(NotificationCategory.FAVORITES, true),
    /** FR-122: a customer reported spoiled produce (spec §4.6) — to the stall. */
    QUALITY_REPORTED(NotificationCategory.ORDERS, true),
    /** FR-122: spoiled before its date on a shelf life the stall extended — to every admin. */
    QUALITY_ESCALATED(NotificationCategory.QUALITY_REPORTS, true),
    /** FR-123: an admin confirmed or dismissed the report — to the customer and the stall. */
    QUALITY_DECIDED(NotificationCategory.ORDERS, true),
    /** FR-123: a confirmed report recorded a shelf-life strike on the stall. */
    SHELF_LIFE_VIOLATION(NotificationCategory.ORDERS, true),
    /** FR-123: the stall has 3 strikes in 90 days and cannot extend shelf lives for now. */
    SHELF_LIFE_LOCKED(NotificationCategory.ORDERS, true),
    MESSAGE(NotificationCategory.MESSAGES, false),
    /** The "Send test" button in Settings — belongs to no category, always shown. */
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
