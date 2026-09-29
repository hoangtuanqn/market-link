package com.techx.intervue.modules.review.exceptions;

public class AlreadyRespondedException extends RuntimeException {
    public AlreadyRespondedException() {
        super("You have already responded to this review.");
    }
}
