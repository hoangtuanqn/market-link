package com.techx.intervue.modules.notification.exceptions;

/** Khung giờ banner sai (kết thúc không sau lúc bắt đầu) → 400. */
public class InvalidAnnouncementException extends RuntimeException {
    public InvalidAnnouncementException(String message) {
        super(message);
    }
}
