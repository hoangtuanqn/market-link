package com.techx.intervue.modules.conversation.exceptions;

public class AttachmentTooLargeException extends RuntimeException {
    public AttachmentTooLargeException(long maxBytes) {
        super("The file must be " + (maxBytes / (1024 * 1024)) + " MB or smaller.");
    }
}
