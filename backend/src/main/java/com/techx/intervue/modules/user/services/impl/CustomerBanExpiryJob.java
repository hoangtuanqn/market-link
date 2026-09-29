package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
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
            try {
                customers.setStatus(user.getId(), "active", null, null, null);
            } catch (Exception e) {
                log.error("Could not auto-reactivate user {}: {}", user.getId(), e.getMessage(), e);
            }
        }
    }
}
