package com.techx.intervue.modules.conversation.exceptions;

/**
 * Spec §6.3 — 415. Does not trust the Content-Type the client sent; this is the conclusion after
 * reading the magic bytes.
 */
public class UnsupportedImageTypeException extends RuntimeException {
    public UnsupportedImageTypeException() {
        super("Send a JPEG, PNG or WebP photo.");
    }
}
