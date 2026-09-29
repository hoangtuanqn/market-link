package com.techx.intervue.modules.quality.services.impl;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class SpoilagePolicy {

    public static final int REPORT_DAYS_AFTER_BEST_BEFORE = 2;

    public static final int STRIKE_WINDOW_DAYS = 90;

    public static final int STRIKES_TO_LOCK = 3;

    private SpoilagePolicy() {}

    public static LocalDate reportDeadline(LocalDate bestBefore) {
        return bestBefore.plusDays(REPORT_DAYS_AFTER_BEST_BEFORE);
    }

    public static boolean windowOpen(LocalDate bestBefore, LocalDate today) {
        return !today.isAfter(reportDeadline(bestBefore));
    }

    public static boolean beforePromise(LocalDate spoiledOn, LocalDate bestBefore) {
        return !spoiledOn.isAfter(bestBefore);
    }

    public static boolean escalates(boolean shelfLifeExtended, boolean beforePromise) {
        return shelfLifeExtended && beforePromise;
    }

    public static Instant strikeWindowStart(Instant now) {
        return now.minus(Duration.ofDays(STRIKE_WINDOW_DAYS));
    }

    public static Instant lockedUntil(List<Instant> activeNewestFirst) {
        if (activeNewestFirst.size() < STRIKES_TO_LOCK) {
            return null;
        }
        return activeNewestFirst.get(STRIKES_TO_LOCK - 1).plus(Duration.ofDays(STRIKE_WINDOW_DAYS));
    }
}
