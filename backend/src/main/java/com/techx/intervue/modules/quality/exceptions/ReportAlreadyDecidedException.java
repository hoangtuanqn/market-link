package com.techx.intervue.modules.quality.exceptions;

/** A decided report is final: no reply edit, no second decision — 409 REPORT_ALREADY_DECIDED. */
public class ReportAlreadyDecidedException extends RuntimeException {
    public ReportAlreadyDecidedException() {
        super("An admin has already decided on this report.");
    }
}
