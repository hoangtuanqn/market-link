package com.techx.intervue.modules.product.exceptions;

public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException(long id) {
        super("Product not found.");
    }
}
