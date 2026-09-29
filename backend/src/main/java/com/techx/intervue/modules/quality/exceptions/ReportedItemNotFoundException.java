package com.techx.intervue.modules.quality.exceptions;

public class ReportedItemNotFoundException extends RuntimeException {
    public ReportedItemNotFoundException() {
        super("This item is not part of the order.");
    }
}
