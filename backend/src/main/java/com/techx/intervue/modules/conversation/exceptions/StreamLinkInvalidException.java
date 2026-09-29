package com.techx.intervue.modules.conversation.exceptions;

public class StreamLinkInvalidException extends RuntimeException {
    public StreamLinkInvalidException() {
        super("This video link has expired. Open the video again.");
    }
}
