package com.techx.intervue.modules.conversation.exceptions;

/** Spec §5.1 uq_report_once — 409. */
public class AlreadyReportedException extends RuntimeException {
    public AlreadyReportedException() {
        super("You have already reported this message.");
    }
}
