package com.techx.intervue.modules.notification.exceptions;

/** The category does not exist or does not belong to the sender's role → 400. */
public class InvalidNotificationPreferenceException extends RuntimeException {
    public InvalidNotificationPreferenceException(String message) {
        super(message);
    }
}
