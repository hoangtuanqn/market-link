package com.techx.intervue.modules.conversation.exceptions;

public class AttachmentNotYoursException extends RuntimeException {
    public AttachmentNotYoursException() {
        super("This photo is not yours to send.");
    }
}
