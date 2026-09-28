package com.techx.intervue.modules.user.services.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.interfaces.AdminCustomerServiceInterface;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class CustomerBanExpiryJobTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AdminCustomerServiceInterface customers =
            mock(AdminCustomerServiceInterface.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-05T09:00:00Z"), ZoneOffset.UTC);
    private final CustomerBanExpiryJob job =
            new CustomerBanExpiryJob(userRepository, customers, clock);

    @Test
    void reactivatesEveryUserWhoseBanExpired() {
        User expired = User.builder().id(7L).status(UserStatus.INACTIVE).build();
        when(userRepository.findByStatusAndDeactivatedUntilLessThanEqual(
                        eq(UserStatus.INACTIVE), eq(Instant.parse("2026-10-05T09:00:00Z"))))
                .thenReturn(List.of(expired));

        job.reactivateExpiredBans();

        verify(customers).setStatus(7L, "active", null, null, null);
    }

    @Test
    void doesNothingWhenNoBanHasExpired() {
        when(userRepository.findByStatusAndDeactivatedUntilLessThanEqual(any(), any()))
                .thenReturn(List.of());

        job.reactivateExpiredBans();

        verify(customers, never()).setStatus(anyLong(), any(), any(), any(), any());
    }

    @Test
    void oneFailingUserDoesNotStrandTheRest() {
        User broken = User.builder().id(1L).status(UserStatus.INACTIVE).build();
        User ok = User.builder().id(2L).status(UserStatus.INACTIVE).build();
        when(userRepository.findByStatusAndDeactivatedUntilLessThanEqual(any(), any()))
                .thenReturn(List.of(broken, ok));
        when(customers.setStatus(eq(1L), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("lock timeout"));

        job.reactivateExpiredBans();

        verify(customers).setStatus(2L, "active", null, null, null);
    }
}
