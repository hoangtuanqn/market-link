package com.techx.intervue.modules.order.exceptions;

/**
 * Id đơn không tồn tại → 404 NOT_FOUND. Khác với {@link OrderNotYoursException} (403): đây là dùng
 * khi hàng thật sự không có, không phải khi có nhưng sai chủ (R-06, Review focus #3).
 */
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(long orderId) {
        super("Order " + orderId + " does not exist.");
    }
}
