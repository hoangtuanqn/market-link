package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * FR-072: one wording for "why can't I sign in", read by both the login flow (UserService) and a
 * live session cut off mid-use (JwtAuthFilter) — so both say exactly the same thing.
 */
public final class DeactivationMessage {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private DeactivationMessage() {}

    public static String of(User user) {
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
