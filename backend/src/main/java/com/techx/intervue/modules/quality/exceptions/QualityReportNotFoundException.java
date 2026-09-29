package com.techx.intervue.modules.quality.exceptions;

public class QualityReportNotFoundException extends RuntimeException {
    public QualityReportNotFoundException() {
        super("Report not found.");
    }
}
