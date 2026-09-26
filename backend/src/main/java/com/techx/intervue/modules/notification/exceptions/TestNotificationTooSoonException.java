package com.techx.intervue.modules.notification.exceptions;

/** Nút "Gửi thử" bấm lại trong 10 giây → 429. */
public class TestNotificationTooSoonException extends RuntimeException {
    public TestNotificationTooSoonException() {
        super("Wait a few seconds before sending another test.");
    }
}
