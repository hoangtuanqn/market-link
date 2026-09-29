package com.techx.intervue.modules.notification.exceptions;

public class NotificationAccessDeniedException extends RuntimeException {
    public NotificationAccessDeniedException() {
        super("This notification belongs to another account.");
    }
}
