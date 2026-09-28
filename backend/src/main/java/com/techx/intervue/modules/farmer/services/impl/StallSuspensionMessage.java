package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * FR-071/D-09: the one place that decides whether a stall may be used, and the one wording a
 * suspended Farmer reads — on the API, in the dialog and in the email alike.
 *
 * <p>This check used to be a private {@code requireApproved} copied into five services. That is the
 * shape that produced a real bug in FR-072 (seven copies of a status check, one updated, six left
 * saying the wrong thing), so it lives here instead: a new call site cannot take the check without
 * also taking the message.
 */
public final class StallSuspensionMessage {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private StallSuspensionMessage() {}

    /**
     * Passes for an APPROVED stall. A SUSPENDED one throws {@link StallSuspendedException} with the
     * admin's reason; anything else (pending, rejected) keeps the older {@link
     * StallNotApprovedException} — it is not a ban and must not be worded like one.
     */
    public static void assertUsable(FarmerProfile profile) {
        if (profile.getApprovalStatus() == ApprovalStatus.APPROVED) return;
        if (profile.getApprovalStatus() == ApprovalStatus.SUSPENDED) {
            throw new StallSuspendedException(of(profile));
        }
        throw new StallNotApprovedException();
    }

    public static String of(FarmerProfile profile) {
        String reason =
                profile.getSuspendReason() == null ? "not specified" : profile.getSuspendReason();
        String opening =
                profile.getSuspendedUntil() == null
                        ? "Your stall is suspended."
                        : "Your stall is suspended until "
                                + TIME.format(profile.getSuspendedUntil().atZone(ZONE))
                                + ".";
        // D-09: they keep serving what customers already ordered, so never imply everything
        // stopped.
        return opening
                + " Reason: "
                + reason
                + ". Orders you have already accepted must still be completed.";
    }
}
