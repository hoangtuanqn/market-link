package com.techx.intervue.modules.quality.exceptions;

public class ItemAlreadyReportedException extends RuntimeException {
    public ItemAlreadyReportedException() {
        super("You have already reported this item.");
    }
}
