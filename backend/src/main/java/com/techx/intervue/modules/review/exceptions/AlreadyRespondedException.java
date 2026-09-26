package com.techx.intervue.modules.review.exceptions;

/** FR-053 is 1-1: a second answer is a 409 ALREADY_RESPONDED. */
public class AlreadyRespondedException extends RuntimeException {
    public AlreadyRespondedException() {
        super("You have already responded to this review.");
    }
}
