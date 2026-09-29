package com.techx.intervue.modules.order.exceptions;

public class ProductNotInOrderException extends RuntimeException {
    public ProductNotInOrderException(Long productId) {
        super("Product " + productId + " is not part of this order.");
    }
}
