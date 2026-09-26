package com.techx.intervue.modules.review.exceptions;

/** Second review of the same target on the same order — 409 ALREADY_REVIEWED. */
public class AlreadyReviewedException extends RuntimeException {
    public AlreadyReviewedException() {
        super("You have already reviewed this.");
    }
}
