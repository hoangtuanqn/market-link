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

        assertThat(message).contains("09:00 05/10/2026").contains("Complaints");
    }

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
