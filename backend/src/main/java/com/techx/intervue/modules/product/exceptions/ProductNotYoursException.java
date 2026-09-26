package com.techx.intervue.modules.product.exceptions;

/** R-06: the product is real but belongs to another stall → 403, not 404. */
public class ProductNotYoursException extends RuntimeException {
    public ProductNotYoursException() {
        super("This product belongs to another stall.");
    }
}
