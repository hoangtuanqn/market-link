package com.techx.intervue.modules.conversation.exceptions;

public class UnsupportedImageTypeException extends RuntimeException {
    public UnsupportedImageTypeException() {
        super("Send a JPEG, PNG, WebP, GIF or AVIF photo, or an MP4, MOV or WebM video.");
    }

    public UnsupportedImageTypeException(String message) {
        super(message);
    }
}
