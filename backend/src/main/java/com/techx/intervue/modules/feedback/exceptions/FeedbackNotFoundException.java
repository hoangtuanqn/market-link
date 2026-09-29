package com.techx.intervue.modules.feedback.exceptions;

public class FeedbackNotFoundException extends RuntimeException {
    public FeedbackNotFoundException() {
        super("Feedback not found.");
    }
}
