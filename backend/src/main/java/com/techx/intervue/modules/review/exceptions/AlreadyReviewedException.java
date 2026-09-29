package com.techx.intervue.modules.review.exceptions;

public class AlreadyReviewedException extends RuntimeException {
    public AlreadyReviewedException() {
        super("You have already reviewed this.");
    }
}
