package com.techx.intervue.modules.product.exceptions;

/** R-06: sản phẩm có thật nhưng thuộc stall khác → 403, không phải 404. */
public class ProductNotYoursException extends RuntimeException {
    public ProductNotYoursException() {
        super("This product belongs to another stall.");
    }
}
