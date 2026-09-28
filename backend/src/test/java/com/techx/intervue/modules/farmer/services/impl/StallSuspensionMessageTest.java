package com.techx.intervue.modules.farmer.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * FR-071/D-09: the approval check lived in five services as a copy-paste. One of them getting a new
 * rule and the others not is exactly how FR-072's Google sign-in kept the wrong wording, so it is
 * one guard here — and a suspended stall is told apart from one that was never approved, because
 * the two need different words.
 */
class StallSuspensionMessageTest {

    private static FarmerProfile profile(ApprovalStatus status, String reason, Instant until) {
        FarmerProfile p = new FarmerProfile();
        p.setApprovalStatus(status);
        p.setSuspendReason(reason);
        p.setSuspendedUntil(until);
        return p;
    }

    @Test
    void anApprovedStallPassesThrough() {
        assertThatCode(
                        () ->
                                StallSuspensionMessage.assertUsable(
                                        profile(ApprovalStatus.APPROVED, null, null)))
                .doesNotThrowAnyException();
    }

    @Test
    void aSuspendedStallIsRefusedWithTheReason() {
        assertThatThrownBy(
                        () ->
                                StallSuspensionMessage.assertUsable(
                                        profile(ApprovalStatus.SUSPENDED, "Missed pickups", null)))
                .isInstanceOf(StallSuspendedException.class)
                .hasMessageContaining("Missed pickups");
    }

    /**
     * D-09: the letter and the screen must both say the accepted orders still have to be served.
     */
    @Test
    void aPermanentSuspensionStillTellsThemToFinishAcceptedOrders() {
        assertThat(StallSuspensionMessage.of(profile(ApprovalStatus.SUSPENDED, "Complaints", null)))
                .contains("Complaints")
                .contains("already accepted")
                .doesNotContain("until ");
    }

    @Test
    void aTemporarySuspensionSaysWhenItLifts() {
        String message =
                StallSuspensionMessage.of(
                        profile(
                                ApprovalStatus.SUSPENDED,
                                "Complaints",
                                Instant.parse("2026-10-05T02:00:00Z")));

        assertThat(message).contains("09:00 05/10/2026").contains("Complaints"); // Asia/Ho_Chi_Minh
    }

    /** Pending/rejected is not a ban: it keeps the older, separate exception and wording. */
    @Test
    void aStallThatWasNeverApprovedKeepsTheOtherException() {
        assertThatThrownBy(
                        () ->
                                StallSuspensionMessage.assertUsable(
                                        profile(ApprovalStatus.PENDING, null, null)))
                .isInstanceOf(StallNotApprovedException.class);
    }

    @Test
    void aRejectedStallAlsoKeepsTheOtherException() {
        assertThatThrownBy(
                        () ->
                                StallSuspensionMessage.assertUsable(
                                        profile(ApprovalStatus.REJECTED, null, null)))
                .isInstanceOf(StallNotApprovedException.class);
    }
}
