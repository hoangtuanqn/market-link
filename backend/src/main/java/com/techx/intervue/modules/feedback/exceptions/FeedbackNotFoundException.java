package com.techx.intervue.modules.feedback.exceptions;

/** 404 for an unknown feedback id. */
public class FeedbackNotFoundException extends RuntimeException {
    public FeedbackNotFoundException() {
        super("Feedback not found.");
    }
}
