package com.techx.intervue.modules.notification.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.techx.intervue.modules.user.enums.RoleType;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Nhóm người dùng bật / tắt trong Settings → Thông báo (spec §3). Mỗi vai chỉ thấy nhóm của mình;
 * code camelCase là giá trị của cột notification_preferences.category và của JSON.
 */
public enum NotificationCategory {
    MESSAGES("messages", EnumSet.of(RoleType.CUSTOMER, RoleType.FARMER)),
    ANNOUNCEMENTS("announcements", EnumSet.of(RoleType.CUSTOMER, RoleType.FARMER)),
    ACCOUNT("account", EnumSet.of(RoleType.CUSTOMER, RoleType.FARMER)),
    FARMER_APPLICATIONS("farmerApplications", EnumSet.of(RoleType.ADMIN));

    private final String code;
    private final Set<RoleType> roles;

    NotificationCategory(String code, Set<RoleType> roles) {
        this.code = code;
        this.roles = roles;
    }

    @JsonValue
    public String code() {
        return code;
    }

    public boolean visibleTo(RoleType role) {
        return roles.contains(role);
    }

    public static List<NotificationCategory> forRole(RoleType role) {
        return Arrays.stream(values()).filter(c -> c.visibleTo(role)).toList();
    }

    public static Optional<NotificationCategory> fromCode(String code) {
        return Arrays.stream(values()).filter(c -> c.code.equals(code)).findFirst();
    }
}
