package com.techx.intervue.modules.farmer.services.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class FarmerSuspensionExpiryJobTest {

    private final FarmerProfileRepository profiles = mock(FarmerProfileRepository.class);
    private final FarmerServiceInterface farmers = mock(FarmerServiceInterface.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-05T09:00:00Z"), ZoneOffset.UTC);
    private final FarmerSuspensionExpiryJob job =
            new FarmerSuspensionExpiryJob(profiles, farmers, clock);

    @Test
    void reinstatesEveryStallWhoseSuspensionExpired() {
        FarmerProfile expired =
                FarmerProfile.builder().id(7L).approvalStatus(ApprovalStatus.SUSPENDED).build();
        when(profiles.findByApprovalStatusAndSuspendedUntilLessThanEqual(
                        eq(ApprovalStatus.SUSPENDED), eq(Instant.parse("2026-10-05T09:00:00Z"))))
                .thenReturn(List.of(expired));

        job.reinstateExpiredSuspensions();

        verify(farmers).reinstate(7L, null);
    }

    @Test
    void doesNothingWhenNoSuspensionHasExpired() {
        when(profiles.findByApprovalStatusAndSuspendedUntilLessThanEqual(any(), any()))
                .thenReturn(List.of());

        job.reinstateExpiredSuspensions();

        verify(farmers, never()).reinstate(anyLong(), isNull());
    }

    @Test
    void oneFailingStallDoesNotStrandTheRest() {
        FarmerProfile broken =
                FarmerProfile.builder().id(1L).approvalStatus(ApprovalStatus.SUSPENDED).build();
        FarmerProfile ok =
                FarmerProfile.builder().id(2L).approvalStatus(ApprovalStatus.SUSPENDED).build();
        when(profiles.findByApprovalStatusAndSuspendedUntilLessThanEqual(any(), any()))
                .thenReturn(List.of(broken, ok));
        when(farmers.reinstate(eq(1L), isNull())).thenThrow(new RuntimeException("lock timeout"));

        job.reinstateExpiredSuspensions();

        verify(farmers).reinstate(2L, null);
    }
}
