package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * FR-072: every minute, reactivates any customer whose temporary ban's {@code deactivated_until}
 * has passed. Goes through {@link AdminCustomerServiceInterface#setStatus} with {@code actorId =
 * null} — the exact same reactivate path a manual admin click takes (clears reason/expiry, writes
 * history, enqueues the "active again" email) — so this job never duplicates that logic.
 */
@Component
@RequiredArgsConstructor
public class CustomerBanExpiryJob {

    private final UserRepository userRepository;
    private final AdminCustomerServiceInterface customers;
    private final Clock clock;

    @Scheduled(fixedDelayString = "PT60S")
    public void reactivateExpiredBans() {
        for (User user :
                userRepository.findByStatusAndDeactivatedUntilLessThanEqual(
                        UserStatus.INACTIVE, Instant.now(clock))) {
            customers.setStatus(user.getId(), "active", null, null, null);
        }
    }
}
