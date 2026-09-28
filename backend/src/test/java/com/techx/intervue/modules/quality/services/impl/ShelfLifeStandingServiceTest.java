package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException;
import com.techx.intervue.modules.quality.repositories.FarmerViolationRepository;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** FR-123 (spec §4.4.4): the stall's strikes and the lock, derived from farmer_violations. */
class ShelfLifeStandingServiceTest {

    private static final long FARMER_ID = 10L;
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-27T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    private FarmerViolationRepository violations;
    private ShelfLifeStandingService service;

    @BeforeEach
    void setUp() {
        violations = mock(FarmerViolationRepository.class);
        service = new ShelfLifeStandingService(violations, CLOCK);
    }

    @Test
    void countsTheStrikesOfTheLast90Days() {
        when(violations.activeTimes(FARMER_ID, Instant.parse("2026-07-29T03:00:00Z")))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-20T03:00:00Z"),
                                Instant.parse("2026-10-10T03:00:00Z")));

        assertThat(service.standing(FARMER_ID))
                .isEqualTo(new ShelfLifeStandingResource(2, 3, 90, null));
    }

    @Test
    void threeStrikesLockUntilTheThirdNewestTurns90DaysOld() {
        when(violations.activeTimes(eq(FARMER_ID), any()))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-20T03:00:00Z"),
                                Instant.parse("2026-10-10T03:00:00Z"),
                                Instant.parse("2026-09-01T03:00:00Z")));

        assertThat(service.standing(FARMER_ID).extensionLockedUntil())
                .isEqualTo(Instant.parse("2026-11-30T03:00:00Z"));
    }

    @Test
    void twoStrikesDoNotStopALongerShelfLife() {
        when(violations.activeTimes(eq(FARMER_ID), any()))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-20T03:00:00Z"),
                                Instant.parse("2026-10-10T03:00:00Z")));

        assertThatCode(() -> service.requireCanExtend(FARMER_ID)).doesNotThrowAnyException();
    }

    /**
     * The end of the lock is named by its day in Ho Chi Minh City: 20:00 UTC is already the 1st.
     */
    @Test
    void aLockedStallIsRefusedWithTheVietnamDayTheLockEnds() {
        when(violations.activeTimes(eq(FARMER_ID), any()))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-20T03:00:00Z"),
                                Instant.parse("2026-10-10T03:00:00Z"),
                                Instant.parse("2026-09-01T20:00:00Z")));

        assertThatThrownBy(() -> service.requireCanExtend(FARMER_ID))
                .isInstanceOf(ShelfLifeExtensionLockedException.class)
                .hasMessageContaining("2026-12-01");
    }
}
