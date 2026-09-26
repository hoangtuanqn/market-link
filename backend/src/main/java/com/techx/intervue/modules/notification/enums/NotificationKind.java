package com.techx.intervue.modules.notification.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.converters.LowercaseEnumConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/**
 * Loại thông báo (spec §3). persistent = có lưu vào bảng notifications (hiện ở /notifications và số
 * trên chuông); tin nhắn chat và "Gửi thử" chỉ đẩy ra màn hình.
 */
public enum NotificationKind {
    ANNOUNCEMENT(NotificationCategory.ANNOUNCEMENTS, true),
    FARMER_APPLICATION(NotificationCategory.FARMER_APPLICATIONS, true),
    FARMER_APPROVED(NotificationCategory.ACCOUNT, true),
    FARMER_REJECTED(NotificationCategory.ACCOUNT, true),
    FARMER_SUSPENDED(NotificationCategory.ACCOUNT, true),
    FARMER_REINSTATED(NotificationCategory.ACCOUNT, true),
    MESSAGE(NotificationCategory.MESSAGES, false),
    /** Nút "Gửi thử" trong Settings — không thuộc nhóm nào, luôn hiện. */
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
