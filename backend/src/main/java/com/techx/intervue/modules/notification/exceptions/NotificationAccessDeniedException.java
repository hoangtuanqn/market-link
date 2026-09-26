package com.techx.intervue.modules.notification.exceptions;

/** R-06: someone else's notification → 403. */
public class NotificationAccessDeniedException extends RuntimeException {
    public NotificationAccessDeniedException() {
        super("This notification belongs to another account.");
    }
}
