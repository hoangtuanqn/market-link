package com.techx.intervue.modules.order.exceptions;

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
