package com.techx.intervue.modules.quality.exceptions;

import java.time.LocalDate;

public class ReportWindowClosedException extends RuntimeException {

    private ReportWindowClosedException(String message) {
        super(message);
    }

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
