package com.techx.intervue.modules.quality.services.impl;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * FR-122, FR-123 (spec §4.4): the rules of spoilage reports and shelf-life strikes, kept pure so
 * the backend and the frontend test the same table of numbers.
 */
public final class SpoilagePolicy {

    /** A customer may report until this many days after the line's last good day. */
    public static final int REPORT_DAYS_AFTER_BEST_BEFORE = 2;

    /** A strike counts for this many days after it was recorded. */
    public static final int STRIKE_WINDOW_DAYS = 90;

    /** This many strikes that still count lock longer shelf lives. */
    public static final int STRIKES_TO_LOCK = 3;

    private SpoilagePolicy() {}

    public static LocalDate reportDeadline(LocalDate bestBefore) {
        return bestBefore.plusDays(REPORT_DAYS_AFTER_BEST_BEFORE);
    }

    public static boolean windowOpen(LocalDate bestBefore, LocalDate today) {
        return !today.isAfter(reportDeadline(bestBefore));
    }

    /** Spoiled on the last good day is still inside the promise. */
    public static boolean beforePromise(LocalDate spoiledOn, LocalDate bestBefore) {
        return !spoiledOn.isAfter(bestBefore);
    }

    /** Spec §4.4.1: only an extended shelf life that failed before its own promise. */
    public static boolean escalates(boolean shelfLifeExtended, boolean beforePromise) {
        return shelfLifeExtended && beforePromise;
    }

    public static Instant strikeWindowStart(Instant now) {
        return now.minus(Duration.ofDays(STRIKE_WINDOW_DAYS));
    }

    /**
     * When the lock ends: the third newest strike plus 90 days, because from then on only two
     * strikes still count (spec §4.4.4). Null when fewer than three strikes count. The list holds
     * only strikes inside the window, newest first.
     */
    public static Instant lockedUntil(List<Instant> activeNewestFirst) {
        if (activeNewestFirst.size() < STRIKES_TO_LOCK) {
            return null;
        }
        return activeNewestFirst.get(STRIKES_TO_LOCK - 1).plus(Duration.ofDays(STRIKE_WINDOW_DAYS));
    }
}
