package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.security.authentication.DisabledException;

public final class DeactivationMessage {

    public static final String GENERIC_LOCKED =
            "Your account has been locked. Please contact an administrator.";

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private DeactivationMessage() {}

    public static void assertActive(User user) {
        if (user.getStatus() == UserStatus.ACTIVE) return;
        throw new DisabledException(of(user));
    }

    public static String of(User user) {
        if (user.getStatus() != UserStatus.INACTIVE) {
            return GENERIC_LOCKED;
        }
        String reason =
                user.getDeactivationReason() == null
                        ? "not specified"
                        : user.getDeactivationReason();
        if (user.getDeactivatedUntil() == null) {
            return "Your account has been deactivated. Reason: "
                    + reason
                    + ". Please contact an administrator.";
        }
        return "Your account has been temporarily suspended until "
                + TIME.format(user.getDeactivatedUntil().atZone(ZONE))
                + ". Reason: "
                + reason
                + ".";
    }
}
