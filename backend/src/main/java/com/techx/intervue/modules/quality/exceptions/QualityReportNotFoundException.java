package com.techx.intervue.modules.quality.exceptions;

/** 404: no report with this id. */
public class QualityReportNotFoundException extends RuntimeException {
    public QualityReportNotFoundException() {
        super("Report not found.");
    }
}
