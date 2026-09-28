package com.techx.intervue.modules.conversation.exceptions;

/**
 * Spec §6.3 — 415. Does not trust the Content-Type the client sent; this is the conclusion after
 * reading the magic bytes.
 */
public class UnsupportedImageTypeException extends RuntimeException {
    public UnsupportedImageTypeException() {
        super("Send a JPEG, PNG, WebP, GIF or AVIF photo, or an MP4, MOV or WebM video.");
    }

    /** FR-115: a format we recognise but do not keep, with how to fix it (e.g. HEIC). */
    public UnsupportedImageTypeException(String message) {
        super(message);
    }
}
