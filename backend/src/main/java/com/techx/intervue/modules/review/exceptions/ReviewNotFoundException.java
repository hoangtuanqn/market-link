package com.techx.intervue.modules.review.exceptions;

public class ReviewNotFoundException extends RuntimeException {
    public ReviewNotFoundException() {
        super("Review not found.");
    }
}
