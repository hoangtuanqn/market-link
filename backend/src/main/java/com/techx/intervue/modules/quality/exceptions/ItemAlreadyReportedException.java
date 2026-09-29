package com.techx.intervue.modules.quality.exceptions;

/** Spec §4.4.1: each line is reported once — 409 ALREADY_REPORTED. */
public class ItemAlreadyReportedException extends RuntimeException {
    public ItemAlreadyReportedException() {
        super("You have already reported this item.");
    }
}
