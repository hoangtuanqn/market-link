package com.techx.intervue.modules.product.exceptions;

/** `{id}` missing, soft-deleted, hidden or the stall is not approved → 404 (R-06, D-09). */
public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException(long id) {
        super("Product not found.");
    }
}
