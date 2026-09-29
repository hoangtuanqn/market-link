package com.techx.intervue.modules.notification.exceptions;

public class TestNotificationTooSoonException extends RuntimeException {
    public TestNotificationTooSoonException() {
        super("Wait a few seconds before sending another test.");
    }
}
