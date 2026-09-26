package com.techx.intervue.modules.review.exceptions;

/** R-06: the review belongs to another stall — 403, never 404. */
public class ReviewNotYoursException extends RuntimeException {
    public ReviewNotYoursException() {
        super("This review is about another stall.");
    }
}
