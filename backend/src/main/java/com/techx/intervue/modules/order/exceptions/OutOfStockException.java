package com.techx.intervue.modules.order.exceptions;

/**
 * D-02: the product does not have enough stock, is sold out, hidden, deleted, or no longer exists
 * at order time → 409 OUT_OF_STOCK, the cart must reload. {@code productName} is null when the
 * product row is gone.
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
