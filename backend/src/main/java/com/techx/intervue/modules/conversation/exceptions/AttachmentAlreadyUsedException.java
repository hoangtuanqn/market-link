package com.techx.intervue.modules.conversation.exceptions;

public class AttachmentAlreadyUsedException extends RuntimeException {
    public AttachmentAlreadyUsedException() {
        super("This photo has already been sent. Upload it again to send it once more.");
    }
}
