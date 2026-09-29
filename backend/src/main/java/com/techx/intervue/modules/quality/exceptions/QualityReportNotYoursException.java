package com.techx.intervue.modules.quality.exceptions;

public class QualityReportNotYoursException extends RuntimeException {
    public QualityReportNotYoursException() {
        super("This report is about another stall.");
    }
}
