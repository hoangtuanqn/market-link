package com.techx.intervue.modules.notification.exceptions;

/** Invalid banner time window (the end is not after the start) → 400. */
public class InvalidAnnouncementException extends RuntimeException {
    public InvalidAnnouncementException(String message) {
        super(message);
    }
}
