package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * FR-122, FR-123 (spec §9): the rule table that the frontend twin (lib/spoilage.test.ts) repeats
 * with the same numbers.
 */
class SpoilagePolicyTest {

    /** Review Focus #5: the last day of the window still counts, the next one does not. */
    @ParameterizedTest(name = "good until {0}, today {1} -> open={2}")
    @CsvSource({
        "2026-10-05,2026-10-03,true",
        "2026-10-05,2026-10-05,true",
        "2026-10-05,2026-10-07,true",
        "2026-10-05,2026-10-08,false"
    })
    void aLineCanBeReportedUntilTwoDaysAfterItsGoodUntilDate(
            String bestBefore, String today, boolean open) {
        assertThat(SpoilagePolicy.windowOpen(LocalDate.parse(bestBefore), LocalDate.parse(today)))
                .isEqualTo(open);
    }

    @Test
    void theDeadlineIsTwoDaysAfterTheGoodUntilDate() {
        assertThat(SpoilagePolicy.reportDeadline(LocalDate.of(2026, 10, 5)))
                .isEqualTo(LocalDate.of(2026, 10, 7));
        assertThat(SpoilagePolicy.reportDeadline(LocalDate.of(2026, 12, 30)))
                .isEqualTo(LocalDate.of(2027, 1, 1));
    }

    @ParameterizedTest(name = "spoiled {0}, good until {1} -> before={2}")
    @CsvSource({
        "2026-10-03,2026-10-05,true",
        "2026-10-05,2026-10-05,true",
        "2026-10-06,2026-10-05,false"
    })
    void spoilingOnTheGoodUntilDayIsStillBeforeThePromise(
            String spoiledOn, String bestBefore, boolean before) {
        assertThat(
                        SpoilagePolicy.beforePromise(
                                LocalDate.parse(spoiledOn), LocalDate.parse(bestBefore)))
                .isEqualTo(before);
    }

    /** Spec §4.4.1: only an extended shelf life that failed early reaches the admins. */
    @ParameterizedTest(name = "extended={0}, before={1} -> admins told={2}")
    @CsvSource({"true,true,true", "true,false,false", "false,true,false", "false,false,false"})
    void onlyAnExtendedShelfLifeThatFailedEarlyReachesTheAdmins(
            boolean extended, boolean before, boolean escalates) {
        assertThat(SpoilagePolicy.escalates(extended, before)).isEqualTo(escalates);
    }

    @Test
    void theStrikeWindowReachesNinetyDaysBack() {
        assertThat(SpoilagePolicy.strikeWindowStart(Instant.parse("2026-10-27T00:00:00Z")))
                .isEqualTo(Instant.parse("2026-07-29T00:00:00Z"));
    }

    @Test
    void twoStrikesDoNotLock() {
        assertThat(
                        SpoilagePolicy.lockedUntil(
                                List.of(
                                        Instant.parse("2026-10-20T03:00:00Z"),
                                        Instant.parse("2026-10-10T03:00:00Z"))))
                .isNull();
    }

    /** Spec §4.4.4: the lock ends when the third newest strike turns 90 days old. */
    @Test
    void theThirdNewestStrikeDecidesWhenTheLockEnds() {
        assertThat(
                        SpoilagePolicy.lockedUntil(
                                List.of(
                                        Instant.parse("2026-10-20T03:00:00Z"),
                                        Instant.parse("2026-10-10T03:00:00Z"),
                                        Instant.parse("2026-09-01T03:00:00Z"))))
                .isEqualTo(Instant.parse("2026-11-30T03:00:00Z"));
        assertThat(
                        SpoilagePolicy.lockedUntil(
                                List.of(
                                        Instant.parse("2026-10-25T03:00:00Z"),
                                        Instant.parse("2026-10-20T03:00:00Z"),
                                        Instant.parse("2026-10-10T03:00:00Z"),
                                        Instant.parse("2026-09-01T03:00:00Z"))))
                .isEqualTo(Instant.parse("2027-01-08T03:00:00Z"));
    }
}
