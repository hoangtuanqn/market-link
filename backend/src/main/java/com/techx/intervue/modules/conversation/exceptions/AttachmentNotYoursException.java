package com.techx.intervue.modules.conversation.exceptions;

/** R-06 — someone else's image. 403, not 404: it says plainly that this is not allowed. */
public class AttachmentNotYoursException extends RuntimeException {
    public AttachmentNotYoursException() {
        super("This photo is not yours to send.");
    }
}
