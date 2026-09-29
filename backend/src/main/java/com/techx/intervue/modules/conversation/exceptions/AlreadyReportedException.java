package com.techx.intervue.modules.conversation.exceptions;

public class AlreadyReportedException extends RuntimeException {
    public AlreadyReportedException() {
        super("You have already reported this message.");
    }
}
