package com.techx.intervue.modules.quality.exceptions;

/** R-06: the report is about another stall — 403, never 404. */
public class QualityReportNotYoursException extends RuntimeException {
    public QualityReportNotYoursException() {
        super("This report is about another stall.");
    }
}
