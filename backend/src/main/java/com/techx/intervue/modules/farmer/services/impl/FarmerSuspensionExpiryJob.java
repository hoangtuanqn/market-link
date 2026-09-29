package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * FR-071: every minute, reinstates any stall whose temporary suspension's {@code suspended_until}
 * has passed. Goes through {@link FarmerServiceInterface#reinstate} with {@code actorId = null} —
 * the exact same reinstate path a manual admin click takes (clears reason/expiry, writes history,
 * enqueues the "open again" email) — so this job never duplicates that logic.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FarmerSuspensionExpiryJob {

    private final FarmerProfileRepository farmerProfileRepository;
    private final FarmerServiceInterface farmers;
    private final Clock clock;

    @Scheduled(fixedDelayString = "PT60S")
    public void reinstateExpiredSuspensions() {
        for (FarmerProfile profile :
                farmerProfileRepository.findByApprovalStatusAndSuspendedUntilLessThanEqual(
                        ApprovalStatus.SUSPENDED, Instant.now(clock))) {
            // One stall's failure (a lock timeout, a stale row) must not strand every other
            // expired suspension behind it — the next tick would just hit the same one first and
            // abort again.
            try {
                farmers.reinstate(profile.getId(), null);
            } catch (Exception e) {
                log.error(
                        "Could not auto-reinstate farmer profile {}: {}",
                        profile.getId(),
                        e.getMessage(),
                        e);
            }
        }
    }
}
