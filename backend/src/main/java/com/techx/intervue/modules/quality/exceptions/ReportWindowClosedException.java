package com.techx.intervue.modules.quality.exceptions;

import java.time.LocalDate;

/**
 * Spec §4.4.1, §8: past the good-until date + 2 days, or a line with no good-until date at all —
 * 409 REPORT_WINDOW_CLOSED.
 */
public class ReportWindowClosedException extends RuntimeException {

    private ReportWindowClosedException(String message) {
        super(message);
    }

    /** A line placed before the shelf-life promise existed. */
    public static ReportWindowClosedException noPromise() {
        return new ReportWindowClosedException(
                "This item has no good-until date, so it cannot be reported.");
    }

    public static ReportWindowClosedException closed(LocalDate deadline) {
        return new ReportWindowClosedException(
                "Items can be reported until 2 days after their good-until date. This one closed"
                        + " on "
                        + deadline
                        + ".");
    }
}
