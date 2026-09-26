package com.techx.intervue.modules.notification.exceptions;

/** The "Send test" button pressed again within 10 seconds → 429. */
public class TestNotificationTooSoonException extends RuntimeException {
    public TestNotificationTooSoonException() {
        super("Wait a few seconds before sending another test.");
    }
}
