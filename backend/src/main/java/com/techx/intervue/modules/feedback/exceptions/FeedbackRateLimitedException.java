package com.techx.intervue.modules.feedback.exceptions;

/** 429: more than five submissions in an hour from one address. */
public class FeedbackRateLimitedException extends RuntimeException {
    public FeedbackRateLimitedException() {
        super("You have sent several messages already. Please try again in an hour.");
    }
}
