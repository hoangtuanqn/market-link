package com.techx.intervue.modules.review.exceptions;

/** 404: no such review, or hidden (public callers never learn which). */
public class ReviewNotFoundException extends RuntimeException {
    public ReviewNotFoundException() {
        super("Review not found.");
    }
}
