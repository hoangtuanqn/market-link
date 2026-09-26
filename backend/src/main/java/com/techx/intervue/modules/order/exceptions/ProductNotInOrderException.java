package com.techx.intervue.modules.order.exceptions;

/**
 * D-07: editing an order can only lower quantities or drop items, never add a new product. The
 * customer sends a {@code productId} that was never in this order → a malformed request → 400
 * PRODUCT_NOT_IN_ORDER, not 409 (it is not a status conflict, the request is invalid from the
 * start).
 */
public class ProductNotInOrderException extends RuntimeException {
    public ProductNotInOrderException(Long productId) {
        super("Product " + productId + " is not part of this order.");
    }
}
