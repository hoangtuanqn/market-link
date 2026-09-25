package com.techx.intervue.modules.conversation.exceptions;

/** Spec §6.3 — 415. Không tin Content-Type client gửi; đây là kết luận sau khi đọc magic bytes. */
public class UnsupportedImageTypeException extends RuntimeException {
    public UnsupportedImageTypeException() {
        super("Send a JPEG, PNG or WebP photo.");
    }
}
