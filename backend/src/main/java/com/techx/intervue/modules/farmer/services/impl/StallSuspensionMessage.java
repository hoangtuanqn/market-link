package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class StallSuspensionMessage {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private StallSuspensionMessage() {}

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
        return opening
                + " Reason: "
                + reason
                + ". Orders you have already accepted must still be completed.";
    }
}
