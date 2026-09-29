package com.techx.intervue.modules.quality.exceptions;

public class ReportAlreadyDecidedException extends RuntimeException {
    public ReportAlreadyDecidedException() {
        super("An admin has already decided on this report.");
    }
}
