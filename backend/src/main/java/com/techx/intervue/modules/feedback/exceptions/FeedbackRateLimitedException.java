package com.techx.intervue.modules.feedback.exceptions;

public class FeedbackRateLimitedException extends RuntimeException {
    public FeedbackRateLimitedException() {
        super("You have sent several messages already. Please try again in an hour.");
    }
}
