package com.techx.intervue.modules.conversation.exceptions;

/**
 * FR-115 §5: a stream link whose signature does not match, that has expired, or that is missing a
 * part → 403. The frontend asks for a fresh link once when it sees this.
 */
public class StreamLinkInvalidException extends RuntimeException {
    public StreamLinkInvalidException() {
        super("This video link has expired. Open the video again.");
    }
}
