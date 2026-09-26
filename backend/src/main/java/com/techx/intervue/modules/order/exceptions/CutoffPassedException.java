package com.techx.intervue.modules.order.exceptions;

/** The cutoff time for this order has passed. */
public class CutoffPassedException extends RuntimeException {
    public CutoffPassedException(long orderId) {
        super(String.format("The cutoff for this order has passed."));
    }

    /** Lúc đặt: chưa có đơn nào, slot đã chọn đã quá giờ chốt của stall (D-05). */
    public CutoffPassedException() {
        super("It is too late to order for this pickup time. Choose a later one.");
    }
}
