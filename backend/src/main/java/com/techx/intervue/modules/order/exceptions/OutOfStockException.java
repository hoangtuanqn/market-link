package com.techx.intervue.modules.order.exceptions;

/**
 * D-02: sản phẩm không đủ tồn, đã hết, bị ẩn, bị xoá hoặc không còn tồn tại lúc đặt → 409
 * OUT_OF_STOCK, giỏ phải tải lại. {@code productName} null khi dòng sản phẩm không còn.
 */
public class OutOfStockException extends RuntimeException {

    private final Long productId;

    public OutOfStockException(Long productId, String productName) {
        super(
                productName == null
                        ? "A product in your cart is no longer available. Refresh your cart."
                        : String.format("Not enough \"%s\" left for this order.", productName));
        this.productId = productId;
    }

    public Long getProductId() {
        return productId;
    }
}
