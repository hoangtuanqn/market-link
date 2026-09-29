package com.techx.intervue.modules.product.exceptions;

public class NotNearExpiryException extends RuntimeException {
    public NotNearExpiryException(String message) {
        super(message);
    }
}
