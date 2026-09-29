package com.techx.intervue.modules.review.exceptions;

public class ReviewNotYoursException extends RuntimeException {
    public ReviewNotYoursException() {
        super("This review is about another stall.");
    }
}
