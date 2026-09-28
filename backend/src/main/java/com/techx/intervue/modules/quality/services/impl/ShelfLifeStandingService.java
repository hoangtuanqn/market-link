package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException;
import com.techx.intervue.modules.quality.repositories.FarmerViolationRepository;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-123 (spec §4.4.4): the lock on longer shelf lives is never stored; it is read from the strikes
 * of the last 90 days every time, so it ends by itself and cannot drift from them.
 */
@Service
@AllArgsConstructor
public class ShelfLifeStandingService implements ShelfLifeStandingServiceInterface {

    private final FarmerViolationRepository violations;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public ShelfLifeStandingResource standing(long farmerId) {
        List<Instant> active =
                violations.activeTimes(farmerId, SpoilagePolicy.strikeWindowStart(clock.instant()));
        return new ShelfLifeStandingResource(
                active.size(),
                SpoilagePolicy.STRIKES_TO_LOCK,
                SpoilagePolicy.STRIKE_WINDOW_DAYS,
                SpoilagePolicy.lockedUntil(active));
    }

    @Override
    @Transactional(readOnly = true)
    public void requireCanExtend(long farmerId) {
        Instant until = standing(farmerId).extensionLockedUntil();
        if (until != null) {
            throw new ShelfLifeExtensionLockedException(
                    until.atZone(clock.getZone()).toLocalDate());
        }
    }
}
