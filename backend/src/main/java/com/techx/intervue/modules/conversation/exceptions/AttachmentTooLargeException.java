package com.techx.intervue.modules.conversation.exceptions;

/** Spec §6.3 — 413. */
public class AttachmentTooLargeException extends RuntimeException {
    public AttachmentTooLargeException(long maxBytes) {
        super("The file must be " + (maxBytes / (1024 * 1024)) + " MB or smaller.");
    }
}
