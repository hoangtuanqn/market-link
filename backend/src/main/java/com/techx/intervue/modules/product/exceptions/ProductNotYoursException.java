package com.techx.intervue.modules.product.exceptions;

public class ProductNotYoursException extends RuntimeException {
    public ProductNotYoursException() {
        super("This product belongs to another stall.");
    }
}
