package com.techx.intervue.modules.product.exceptions;

/** `{id}` không có, đã xoá mềm, bị ẩn hoặc stall chưa duyệt → 404 (R-06, D-09). */
public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException(long id) {
        super("Product not found.");
    }
}
