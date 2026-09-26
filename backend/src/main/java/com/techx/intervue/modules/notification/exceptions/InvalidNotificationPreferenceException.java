package com.techx.intervue.modules.notification.exceptions;

/** Nhóm không tồn tại hoặc không thuộc vai của người gửi → 400. */
public class InvalidNotificationPreferenceException extends RuntimeException {
    public InvalidNotificationPreferenceException(String message) {
        super(message);
    }
}
