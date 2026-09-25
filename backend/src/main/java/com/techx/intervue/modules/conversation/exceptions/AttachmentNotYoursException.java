package com.techx.intervue.modules.conversation.exceptions;

/** R-06 — ảnh của người khác. 403, không phải 404: nói thẳng là không được phép. */
public class AttachmentNotYoursException extends RuntimeException {
    public AttachmentNotYoursException() {
        super("This photo is not yours to send.");
    }
}
