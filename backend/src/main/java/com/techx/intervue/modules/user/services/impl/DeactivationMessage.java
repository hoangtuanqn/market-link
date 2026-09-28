package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.security.authentication.DisabledException;

/**
 * FR-072: one wording for "why can't I use my account", read by every auth path (password login,
 * MFA step 2, refresh, Google sign-in, profile edits) and by JwtAuthFilter when it cuts off a live
 * session — so all of them say exactly the same thing, with the real reason the admin gave.
 */
public final class DeactivationMessage {

    /** Statuses other than {@code inactive} are not an FR-072 ban, so they keep the old wording. */
    public static final String GENERIC_LOCKED =
            "Your account has been locked. Please contact an administrator.";

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private DeactivationMessage() {}

    /**
     * The single guard every auth path uses. Kept here next to the wording so a new path cannot
     * copy the check without also getting the right message — the bug this replaced was exactly
     * that: seven copies of the check, only one of them updated.
     */
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
